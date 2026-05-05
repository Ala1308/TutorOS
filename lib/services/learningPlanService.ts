import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  learningPlans,
  students,
  tutors,
  type LearningPlan,
  type LearningPlanGoal,
  type NewLearningPlan,
} from "@/lib/db/schema";
import {
  learningPlanCreateSchema,
  learningPlanUpdateSchema,
  type LearningPlanCreateInput,
  type LearningPlanUpdateInput,
} from "@/lib/schemas/academics";
import { NotFoundError, ValidationError } from "@/lib/utils/errors";

import type { Actor } from "@/lib/auth/types";

import { auditService } from "./auditService";

const ENTITY = "LearningPlan";

export interface LearningPlanWithRefs extends LearningPlan {
  studentFirstName: string;
  studentLastName: string;
  tutorFullName: string | null;
}

type RawGoal = {
  id: string;
  title: string;
  done: boolean;
  note?: string | undefined;
  completedAt?: string | undefined;
};

function normalizeGoals(goals: RawGoal[]): LearningPlanGoal[] {
  return goals.map((g) => {
    const out: LearningPlanGoal = { id: g.id, title: g.title, done: g.done };
    if (g.note) out.note = g.note;
    if (g.completedAt) out.completedAt = g.completedAt;
    return out;
  });
}

export const learningPlanService = {
  async list(
    args: { limit?: number; offset?: number; studentId?: string } = {},
  ): Promise<LearningPlanWithRefs[]> {
    const limit = Math.min(args.limit ?? 50, 100);
    const offset = args.offset ?? 0;

    const filters = [isNull(learningPlans.deletedAt)];
    if (args.studentId)
      filters.push(eq(learningPlans.studentId, args.studentId));

    const rows = await db
      .select({
        p: learningPlans,
        studentFirstName: students.firstName,
        studentLastName: students.lastName,
        tutorFullName: tutors.fullName,
      })
      .from(learningPlans)
      .innerJoin(students, eq(learningPlans.studentId, students.id))
      .leftJoin(tutors, eq(learningPlans.tutorId, tutors.id))
      .where(and(...filters))
      .orderBy(desc(learningPlans.createdAt))
      .limit(limit)
      .offset(offset);

    return rows.map((r) => ({
      ...r.p,
      studentFirstName: r.studentFirstName,
      studentLastName: r.studentLastName,
      tutorFullName: r.tutorFullName,
    }));
  },

  async listForStudent(studentId: string): Promise<LearningPlan[]> {
    return db
      .select()
      .from(learningPlans)
      .where(
        and(
          eq(learningPlans.studentId, studentId),
          isNull(learningPlans.deletedAt),
        ),
      )
      .orderBy(desc(learningPlans.createdAt));
  },

  async get(id: string): Promise<LearningPlan | null> {
    const [row] = await db
      .select()
      .from(learningPlans)
      .where(and(eq(learningPlans.id, id), isNull(learningPlans.deletedAt)))
      .limit(1);
    return row ?? null;
  },

  async getOrThrow(id: string): Promise<LearningPlan> {
    const row = await this.get(id);
    if (!row) throw new NotFoundError("Learning plan not found");
    return row;
  },

  async create(
    input: LearningPlanCreateInput,
    opts: { actor: Actor },
  ): Promise<LearningPlan> {
    const validated = learningPlanCreateSchema.parse(input);

    return db.transaction(async (tx) => {
      const [student] = await tx
        .select({ id: students.id })
        .from(students)
        .where(
          and(eq(students.id, validated.studentId), isNull(students.deletedAt)),
        )
        .limit(1);
      if (!student) throw new ValidationError("Student does not exist");

      if (validated.tutorId) {
        const [tutor] = await tx
          .select({ id: tutors.id })
          .from(tutors)
          .where(
            and(eq(tutors.id, validated.tutorId), isNull(tutors.deletedAt)),
          )
          .limit(1);
        if (!tutor) throw new ValidationError("Tutor does not exist");
      }

      const row: NewLearningPlan = {
        studentId: validated.studentId,
        title: validated.title,
        status: validated.status,
        goals: normalizeGoals(validated.goals),
        ...(validated.tutorId ? { tutorId: validated.tutorId } : {}),
        ...(validated.summary ? { summary: validated.summary } : {}),
        ...(validated.subject ? { subject: validated.subject } : {}),
        ...(validated.startDate
          ? { startDate: new Date(validated.startDate) }
          : {}),
        ...(validated.endDate ? { endDate: new Date(validated.endDate) } : {}),
      };

      const [inserted] = await tx.insert(learningPlans).values(row).returning();
      if (!inserted) throw new Error("Failed to insert learning plan");

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "learningPlan.created",
          entityType: ENTITY,
          entityId: inserted.id,
          metadata: {
            studentId: inserted.studentId,
            title: inserted.title,
            status: inserted.status,
          },
        },
        tx,
      );

      return inserted;
    });
  },

  async update(
    id: string,
    input: LearningPlanUpdateInput,
    opts: { actor: Actor },
  ): Promise<LearningPlan> {
    const validated = learningPlanUpdateSchema.parse(input);

    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(learningPlans)
        .where(and(eq(learningPlans.id, id), isNull(learningPlans.deletedAt)))
        .limit(1);
      if (!existing) throw new NotFoundError("Learning plan not found");

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (validated.title !== undefined) updates.title = validated.title;
      if (validated.summary !== undefined) updates.summary = validated.summary;
      if (validated.subject !== undefined) updates.subject = validated.subject;
      if (validated.status !== undefined) updates.status = validated.status;
      if (validated.tutorId !== undefined) updates.tutorId = validated.tutorId;
      if (validated.startDate !== undefined)
        updates.startDate = new Date(validated.startDate);
      if (validated.endDate !== undefined)
        updates.endDate = new Date(validated.endDate);
      if (validated.goals !== undefined)
        updates.goals = normalizeGoals(validated.goals);

      const [updated] = await tx
        .update(learningPlans)
        .set(updates)
        .where(eq(learningPlans.id, id))
        .returning();
      if (!updated) throw new Error("Failed to update learning plan");

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "learningPlan.updated",
          entityType: ENTITY,
          entityId: id,
          metadata: {
            changed: Object.keys(updates).filter((k) => k !== "updatedAt"),
          },
        },
        tx,
      );

      return updated;
    });
  },

  async softDelete(id: string, opts: { actor: Actor }): Promise<void> {
    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(learningPlans)
        .where(and(eq(learningPlans.id, id), isNull(learningPlans.deletedAt)))
        .limit(1);
      if (!existing) throw new NotFoundError("Learning plan not found");

      await tx
        .update(learningPlans)
        .set({ deletedAt: new Date() })
        .where(eq(learningPlans.id, id));

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "learningPlan.deleted",
          entityType: ENTITY,
          entityId: id,
        },
        tx,
      );
    });
  },
};
