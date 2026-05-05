import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  assessments,
  students,
  tutoringSessions,
  tutors,
  type Assessment,
  type NewAssessment,
} from "@/lib/db/schema";
import {
  assessmentCreateSchema,
  assessmentUpdateSchema,
  type AssessmentCreateInput,
  type AssessmentUpdateInput,
} from "@/lib/schemas/academics";
import { NotFoundError, ValidationError } from "@/lib/utils/errors";

import type { Actor } from "@/lib/auth/types";

import { auditService } from "./auditService";

export interface AssessmentWithRefs extends Assessment {
  studentFirstName: string;
  studentLastName: string;
  tutorFullName: string | null;
}

const ENTITY = "Assessment";

export const assessmentService = {
  async list(
    args: { limit?: number; offset?: number; studentId?: string } = {},
  ): Promise<AssessmentWithRefs[]> {
    const limit = Math.min(args.limit ?? 50, 100);
    const offset = args.offset ?? 0;

    const filters = [isNull(assessments.deletedAt)];
    if (args.studentId) filters.push(eq(assessments.studentId, args.studentId));

    const rows = await db
      .select({
        a: assessments,
        studentFirstName: students.firstName,
        studentLastName: students.lastName,
        tutorFullName: tutors.fullName,
      })
      .from(assessments)
      .innerJoin(students, eq(assessments.studentId, students.id))
      .leftJoin(tutors, eq(assessments.tutorId, tutors.id))
      .where(and(...filters))
      .orderBy(desc(assessments.createdAt))
      .limit(limit)
      .offset(offset);

    return rows.map((r) => ({
      ...r.a,
      studentFirstName: r.studentFirstName,
      studentLastName: r.studentLastName,
      tutorFullName: r.tutorFullName,
    }));
  },

  async listForStudent(studentId: string): Promise<Assessment[]> {
    return db
      .select()
      .from(assessments)
      .where(
        and(
          eq(assessments.studentId, studentId),
          isNull(assessments.deletedAt),
        ),
      )
      .orderBy(desc(assessments.createdAt));
  },

  async get(id: string): Promise<Assessment | null> {
    const [row] = await db
      .select()
      .from(assessments)
      .where(and(eq(assessments.id, id), isNull(assessments.deletedAt)))
      .limit(1);
    return row ?? null;
  },

  async getOrThrow(id: string): Promise<Assessment> {
    const row = await this.get(id);
    if (!row) throw new NotFoundError("Assessment not found");
    return row;
  },

  async create(
    input: AssessmentCreateInput,
    opts: { actor: Actor },
  ): Promise<Assessment> {
    const validated = assessmentCreateSchema.parse(input);

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

      const row: NewAssessment = {
        studentId: validated.studentId,
        type: validated.type,
        subject: validated.subject,
        title: validated.title,
        skills: validated.skills,
        ...(validated.tutorId ? { tutorId: validated.tutorId } : {}),
        ...(validated.sessionId ? { sessionId: validated.sessionId } : {}),
        ...(validated.scoreNumerator !== undefined
          ? { scoreNumerator: validated.scoreNumerator }
          : {}),
        ...(validated.scoreDenominator !== undefined
          ? { scoreDenominator: validated.scoreDenominator }
          : {}),
        ...(validated.level ? { level: validated.level } : {}),
        ...(validated.observations
          ? { observations: validated.observations }
          : {}),
        ...(validated.recommendations
          ? { recommendations: validated.recommendations }
          : {}),
      };

      const [inserted] = await tx.insert(assessments).values(row).returning();
      if (!inserted) throw new Error("Failed to insert assessment");

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "assessment.created",
          entityType: ENTITY,
          entityId: inserted.id,
          metadata: {
            studentId: inserted.studentId,
            type: inserted.type,
            subject: inserted.subject,
          },
        },
        tx,
      );

      return inserted;
    });
  },

  async update(
    id: string,
    input: AssessmentUpdateInput,
    opts: { actor: Actor },
  ): Promise<Assessment> {
    const validated = assessmentUpdateSchema.parse(input);

    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(assessments)
        .where(and(eq(assessments.id, id), isNull(assessments.deletedAt)))
        .limit(1);
      if (!existing) throw new NotFoundError("Assessment not found");

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      for (const [k, v] of Object.entries(validated)) {
        if (v === undefined) continue;
        // Allow null to clear score columns explicitly.
        updates[k] = v;
      }

      const [updated] = await tx
        .update(assessments)
        .set(updates)
        .where(eq(assessments.id, id))
        .returning();
      if (!updated) throw new Error("Failed to update assessment");

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "assessment.updated",
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
        .from(assessments)
        .where(and(eq(assessments.id, id), isNull(assessments.deletedAt)))
        .limit(1);
      if (!existing) throw new NotFoundError("Assessment not found");

      await tx
        .update(assessments)
        .set({ deletedAt: new Date() })
        .where(eq(assessments.id, id));

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "assessment.deleted",
          entityType: ENTITY,
          entityId: id,
        },
        tx,
      );
    });
  },
};
