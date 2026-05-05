import { and, asc, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  homework,
  students,
  tutoringSessions,
  tutors,
  type Homework,
  type NewHomework,
} from "@/lib/db/schema";
import {
  homeworkCreateSchema,
  homeworkStatusSchema,
  homeworkUpdateSchema,
  type HomeworkCreateInput,
  type HomeworkStatusInput,
  type HomeworkUpdateInput,
} from "@/lib/schemas/academics";
import { NotFoundError, ValidationError } from "@/lib/utils/errors";

import type { Actor } from "@/lib/auth/types";

import { auditService } from "./auditService";

const ENTITY = "Homework";

export interface HomeworkWithRefs extends Homework {
  studentFirstName: string;
  studentLastName: string;
  tutorFullName: string | null;
}

export const homeworkService = {
  async list(
    args: {
      limit?: number;
      offset?: number;
      studentId?: string;
      openOnly?: boolean;
    } = {},
  ): Promise<HomeworkWithRefs[]> {
    const limit = Math.min(args.limit ?? 50, 100);
    const offset = args.offset ?? 0;

    const filters = [isNull(homework.deletedAt)];
    if (args.studentId) filters.push(eq(homework.studentId, args.studentId));

    const rows = await db
      .select({
        h: homework,
        studentFirstName: students.firstName,
        studentLastName: students.lastName,
        tutorFullName: tutors.fullName,
      })
      .from(homework)
      .innerJoin(students, eq(homework.studentId, students.id))
      .leftJoin(tutors, eq(homework.tutorId, tutors.id))
      .where(and(...filters))
      .orderBy(args.openOnly ? asc(homework.dueDate) : desc(homework.createdAt))
      .limit(limit)
      .offset(offset);

    const mapped = rows.map((r) => ({
      ...r.h,
      studentFirstName: r.studentFirstName,
      studentLastName: r.studentLastName,
      tutorFullName: r.tutorFullName,
    }));

    if (args.openOnly) {
      return mapped.filter(
        (h) => h.status === "ASSIGNED" || h.status === "SUBMITTED",
      );
    }
    return mapped;
  },

  async listForStudent(studentId: string): Promise<Homework[]> {
    return db
      .select()
      .from(homework)
      .where(and(eq(homework.studentId, studentId), isNull(homework.deletedAt)))
      .orderBy(desc(homework.createdAt));
  },

  async get(id: string): Promise<Homework | null> {
    const [row] = await db
      .select()
      .from(homework)
      .where(and(eq(homework.id, id), isNull(homework.deletedAt)))
      .limit(1);
    return row ?? null;
  },

  async getOrThrow(id: string): Promise<Homework> {
    const row = await this.get(id);
    if (!row) throw new NotFoundError("Homework not found");
    return row;
  },

  async create(
    input: HomeworkCreateInput,
    opts: { actor: Actor },
  ): Promise<Homework> {
    const validated = homeworkCreateSchema.parse(input);

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
      if (validated.sessionId) {
        const [session] = await tx
          .select({ id: tutoringSessions.id })
          .from(tutoringSessions)
          .where(
            and(
              eq(tutoringSessions.id, validated.sessionId),
              isNull(tutoringSessions.deletedAt),
            ),
          )
          .limit(1);
        if (!session) throw new ValidationError("Session does not exist");
      }

      const row: NewHomework = {
        studentId: validated.studentId,
        title: validated.title,
        ...(validated.tutorId ? { tutorId: validated.tutorId } : {}),
        ...(validated.sessionId ? { sessionId: validated.sessionId } : {}),
        ...(validated.subject ? { subject: validated.subject } : {}),
        ...(validated.instructions
          ? { instructions: validated.instructions }
          : {}),
        ...(validated.dueDate ? { dueDate: new Date(validated.dueDate) } : {}),
      };

      const [inserted] = await tx.insert(homework).values(row).returning();
      if (!inserted) throw new Error("Failed to insert homework");

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "homework.created",
          entityType: ENTITY,
          entityId: inserted.id,
          metadata: {
            studentId: inserted.studentId,
            title: inserted.title,
          },
        },
        tx,
      );

      return inserted;
    });
  },

  async update(
    id: string,
    input: HomeworkUpdateInput,
    opts: { actor: Actor },
  ): Promise<Homework> {
    const validated = homeworkUpdateSchema.parse(input);

    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(homework)
        .where(and(eq(homework.id, id), isNull(homework.deletedAt)))
        .limit(1);
      if (!existing) throw new NotFoundError("Homework not found");

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (validated.title !== undefined) updates.title = validated.title;
      if (validated.subject !== undefined) updates.subject = validated.subject;
      if (validated.instructions !== undefined)
        updates.instructions = validated.instructions;
      if (validated.dueDate !== undefined)
        updates.dueDate = new Date(validated.dueDate);
      if (validated.tutorId !== undefined) updates.tutorId = validated.tutorId;
      if (validated.sessionId !== undefined)
        updates.sessionId = validated.sessionId;

      const [updated] = await tx
        .update(homework)
        .set(updates)
        .where(eq(homework.id, id))
        .returning();
      if (!updated) throw new Error("Failed to update homework");

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "homework.updated",
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

  async setStatus(
    input: HomeworkStatusInput,
    opts: { actor: Actor },
  ): Promise<Homework> {
    const validated = homeworkStatusSchema.parse(input);
    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(homework)
        .where(
          and(
            eq(homework.id, validated.homeworkId),
            isNull(homework.deletedAt),
          ),
        )
        .limit(1);
      if (!existing) throw new NotFoundError("Homework not found");

      const updates: Record<string, unknown> = {
        status: validated.status,
        updatedAt: new Date(),
      };

      if (validated.status === "SUBMITTED" && !existing.submittedAt) {
        updates.submittedAt = new Date();
      }
      if (validated.status === "REVIEWED" || validated.status === "COMPLETED") {
        updates.reviewedAt = new Date();
      }

      if (validated.submissionUrl !== undefined)
        updates.submissionUrl = validated.submissionUrl;
      if (validated.submissionNotes !== undefined)
        updates.submissionNotes = validated.submissionNotes;
      if (validated.grade !== undefined) updates.grade = validated.grade;
      if (validated.scorePercent !== undefined)
        updates.scorePercent = validated.scorePercent;
      if (validated.feedback !== undefined)
        updates.feedback = validated.feedback;

      const [updated] = await tx
        .update(homework)
        .set(updates)
        .where(eq(homework.id, validated.homeworkId))
        .returning();
      if (!updated) throw new Error("Failed to update homework status");

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "homework.status.updated",
          entityType: ENTITY,
          entityId: updated.id,
          metadata: { from: existing.status, to: validated.status },
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
        .from(homework)
        .where(and(eq(homework.id, id), isNull(homework.deletedAt)))
        .limit(1);
      if (!existing) throw new NotFoundError("Homework not found");

      await tx
        .update(homework)
        .set({ deletedAt: new Date() })
        .where(eq(homework.id, id));

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "homework.deleted",
          entityType: ENTITY,
          entityId: id,
        },
        tx,
      );
    });
  },
};
