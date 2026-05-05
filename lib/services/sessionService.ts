import { and, asc, desc, eq, gt, gte, isNull, lt, ne } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  students,
  tutoringSessions,
  tutors,
  type NewTutoringSession,
  type TutoringSession,
} from "@/lib/db/schema";
import {
  sessionCreateSchema,
  sessionStatusSchema,
  sessionUpdateSchema,
  type SessionCreateInput,
  type SessionStatusInput,
  type SessionUpdateInput,
} from "@/lib/schemas/session";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/lib/utils/errors";

import type { Actor } from "@/lib/auth/types";

import { auditService } from "./auditService";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface SessionWithPeople extends TutoringSession {
  studentFirstName: string;
  studentLastName: string;
  tutorFullName: string;
}

function diffMinutes(start: Date, end: Date): number {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 60_000));
}

/**
 * Throws ConflictError if `tutorId` already has a non-cancelled session that
 * overlaps the [start, end] window. `excludeSessionId` skips one row (used on
 * update so a session doesn't conflict with itself).
 */
async function assertTutorAvailable(
  tx: Tx,
  args: {
    tutorId: string;
    start: Date;
    end: Date;
    excludeSessionId?: string;
  },
) {
  const conditions = [
    eq(tutoringSessions.tutorId, args.tutorId),
    isNull(tutoringSessions.deletedAt),
    ne(tutoringSessions.status, "CANCELED"),
    lt(tutoringSessions.startTime, args.end),
    gt(tutoringSessions.endTime, args.start),
  ];
  if (args.excludeSessionId) {
    conditions.push(ne(tutoringSessions.id, args.excludeSessionId));
  }
  const overlap = await tx
    .select({ id: tutoringSessions.id })
    .from(tutoringSessions)
    .where(and(...conditions))
    .limit(1);
  if (overlap.length > 0) {
    throw new ConflictError("Tutor already has a session in that time window");
  }
}

export const sessionService = {
  async list(
    args: {
      upcomingOnly?: boolean;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<SessionWithPeople[]> {
    const limit = Math.min(args.limit ?? 50, 100);
    const offset = args.offset ?? 0;

    const filters = [isNull(tutoringSessions.deletedAt)];
    if (args.upcomingOnly) {
      filters.push(gte(tutoringSessions.startTime, new Date()));
    }

    const rows = await db
      .select({
        session: tutoringSessions,
        studentFirstName: students.firstName,
        studentLastName: students.lastName,
        tutorFullName: tutors.fullName,
      })
      .from(tutoringSessions)
      .innerJoin(students, eq(tutoringSessions.studentId, students.id))
      .innerJoin(tutors, eq(tutoringSessions.tutorId, tutors.id))
      .where(and(...filters))
      .orderBy(
        args.upcomingOnly
          ? asc(tutoringSessions.startTime)
          : desc(tutoringSessions.startTime),
      )
      .limit(limit)
      .offset(offset);

    return rows.map((r) => ({
      ...r.session,
      studentFirstName: r.studentFirstName,
      studentLastName: r.studentLastName,
      tutorFullName: r.tutorFullName,
    }));
  },

  async get(id: string): Promise<TutoringSession | null> {
    const [row] = await db
      .select()
      .from(tutoringSessions)
      .where(
        and(eq(tutoringSessions.id, id), isNull(tutoringSessions.deletedAt)),
      )
      .limit(1);
    return row ?? null;
  },

  async getOrThrow(id: string): Promise<TutoringSession> {
    const row = await this.get(id);
    if (!row) throw new NotFoundError("Session not found");
    return row;
  },

  async listForStudent(studentId: string): Promise<TutoringSession[]> {
    return db
      .select()
      .from(tutoringSessions)
      .where(
        and(
          eq(tutoringSessions.studentId, studentId),
          isNull(tutoringSessions.deletedAt),
        ),
      )
      .orderBy(desc(tutoringSessions.startTime));
  },

  async listForTutor(tutorId: string): Promise<TutoringSession[]> {
    return db
      .select()
      .from(tutoringSessions)
      .where(
        and(
          eq(tutoringSessions.tutorId, tutorId),
          isNull(tutoringSessions.deletedAt),
        ),
      )
      .orderBy(desc(tutoringSessions.startTime));
  },

  async create(
    input: SessionCreateInput,
    opts: { actor: Actor },
  ): Promise<TutoringSession> {
    const validated = sessionCreateSchema.parse(input);
    const start = new Date(validated.startTime);
    const end = new Date(validated.endTime);

    return db.transaction(async (tx) => {
      const [student] = await tx
        .select({ id: students.id })
        .from(students)
        .where(
          and(eq(students.id, validated.studentId), isNull(students.deletedAt)),
        )
        .limit(1);
      if (!student) throw new ValidationError("Student does not exist");

      const [tutor] = await tx
        .select({ id: tutors.id })
        .from(tutors)
        .where(and(eq(tutors.id, validated.tutorId), isNull(tutors.deletedAt)))
        .limit(1);
      if (!tutor) throw new ValidationError("Tutor does not exist");

      await assertTutorAvailable(tx, {
        tutorId: validated.tutorId,
        start,
        end,
      });

      const row: NewTutoringSession = {
        studentId: validated.studentId,
        tutorId: validated.tutorId,
        subject: validated.subject,
        startTime: start,
        endTime: end,
        durationMinutes: diffMinutes(start, end),
        ...(validated.googleMeetUrl
          ? { googleMeetUrl: validated.googleMeetUrl }
          : {}),
        ...(validated.notes ? { notes: validated.notes } : {}),
      };

      const [inserted] = await tx
        .insert(tutoringSessions)
        .values(row)
        .returning();
      if (!inserted) throw new Error("Failed to insert session");

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "session.created",
          entityType: "TutoringSession",
          entityId: inserted.id,
          metadata: {
            studentId: inserted.studentId,
            tutorId: inserted.tutorId,
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
    input: SessionUpdateInput,
    opts: { actor: Actor },
  ): Promise<TutoringSession> {
    const validated = sessionUpdateSchema.parse(input);

    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(tutoringSessions)
        .where(
          and(eq(tutoringSessions.id, id), isNull(tutoringSessions.deletedAt)),
        )
        .limit(1);
      if (!existing) throw new NotFoundError("Session not found");

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (validated.subject !== undefined) updates.subject = validated.subject;
      if (validated.tutorId !== undefined) updates.tutorId = validated.tutorId;
      if (validated.googleMeetUrl !== undefined) {
        updates.googleMeetUrl = validated.googleMeetUrl;
      }
      if (validated.notes !== undefined) updates.notes = validated.notes;

      const newStart = validated.startTime
        ? new Date(validated.startTime)
        : existing.startTime;
      const newEnd = validated.endTime
        ? new Date(validated.endTime)
        : existing.endTime;
      if (newEnd <= newStart) {
        throw new ValidationError("endTime must be after startTime");
      }

      if (validated.startTime !== undefined) updates.startTime = newStart;
      if (validated.endTime !== undefined) updates.endTime = newEnd;
      if (
        validated.startTime !== undefined ||
        validated.endTime !== undefined
      ) {
        updates.durationMinutes = diffMinutes(newStart, newEnd);
      }

      const tutorIdForCheck = validated.tutorId ?? existing.tutorId;
      const timeChanged =
        validated.startTime !== undefined ||
        validated.endTime !== undefined ||
        validated.tutorId !== undefined;
      if (timeChanged) {
        await assertTutorAvailable(tx, {
          tutorId: tutorIdForCheck,
          start: newStart,
          end: newEnd,
          excludeSessionId: id,
        });
      }

      const [updated] = await tx
        .update(tutoringSessions)
        .set(updates)
        .where(eq(tutoringSessions.id, id))
        .returning();
      if (!updated) throw new Error("Failed to update session");

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "session.updated",
          entityType: "TutoringSession",
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
    input: SessionStatusInput,
    opts: { actor: Actor },
  ): Promise<TutoringSession> {
    const validated = sessionStatusSchema.parse(input);
    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(tutoringSessions)
        .where(
          and(
            eq(tutoringSessions.id, validated.sessionId),
            isNull(tutoringSessions.deletedAt),
          ),
        )
        .limit(1);
      if (!existing) throw new NotFoundError("Session not found");

      const [updated] = await tx
        .update(tutoringSessions)
        .set({ status: validated.status, updatedAt: new Date() })
        .where(eq(tutoringSessions.id, validated.sessionId))
        .returning();
      if (!updated) throw new Error("Failed to update session status");

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "session.status.updated",
          entityType: "TutoringSession",
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
        .from(tutoringSessions)
        .where(
          and(eq(tutoringSessions.id, id), isNull(tutoringSessions.deletedAt)),
        )
        .limit(1);
      if (!existing) throw new NotFoundError("Session not found");

      await tx
        .update(tutoringSessions)
        .set({ deletedAt: new Date() })
        .where(eq(tutoringSessions.id, id));

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "session.deleted",
          entityType: "TutoringSession",
          entityId: id,
        },
        tx,
      );
    });
  },
};
