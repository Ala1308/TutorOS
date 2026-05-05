import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { tutors, type NewTutor, type Tutor } from "@/lib/db/schema";
import {
  tutorCreateSchema,
  tutorStatusUpdateSchema,
  tutorUpdateSchema,
  type TutorCreateInput,
  type TutorStatusUpdateInput,
  type TutorUpdateInput,
} from "@/lib/schemas/people";
import { ConflictError, NotFoundError } from "@/lib/utils/errors";

import type { Actor } from "@/lib/auth/types";

import { auditService } from "./auditService";

export const tutorService = {
  async list(args: { limit?: number; offset?: number } = {}): Promise<Tutor[]> {
    const limit = Math.min(args.limit ?? 50, 100);
    const offset = args.offset ?? 0;
    return db
      .select()
      .from(tutors)
      .where(isNull(tutors.deletedAt))
      .orderBy(desc(tutors.createdAt))
      .limit(limit)
      .offset(offset);
  },

  async get(id: string): Promise<Tutor | null> {
    const [row] = await db
      .select()
      .from(tutors)
      .where(and(eq(tutors.id, id), isNull(tutors.deletedAt)))
      .limit(1);
    return row ?? null;
  },

  async getOrThrow(id: string): Promise<Tutor> {
    const row = await this.get(id);
    if (!row) throw new NotFoundError("Tutor not found");
    return row;
  },

  async create(
    input: TutorCreateInput,
    opts: { actor: Actor },
  ): Promise<Tutor> {
    const validated = tutorCreateSchema.parse(input);

    return db.transaction(async (tx) => {
      const [duplicate] = await tx
        .select({ id: tutors.id })
        .from(tutors)
        .where(eq(tutors.email, validated.email))
        .limit(1);
      if (duplicate) {
        throw new ConflictError("A tutor with that email already exists");
      }

      const row: NewTutor = {
        fullName: validated.fullName,
        email: validated.email,
        ...(validated.phone ? { phone: validated.phone } : {}),
        status: validated.status,
        subjects: validated.subjects ?? [],
        grades: validated.grades ?? [],
        ...(validated.hourlyRateCents !== undefined
          ? { hourlyRateCents: validated.hourlyRateCents }
          : {}),
        ...(validated.notes ? { notes: validated.notes } : {}),
      };

      const [inserted] = await tx.insert(tutors).values(row).returning();
      if (!inserted) throw new Error("Failed to insert tutor");

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "tutor.created",
          entityType: "Tutor",
          entityId: inserted.id,
          metadata: { email: inserted.email, status: inserted.status },
        },
        tx,
      );

      return inserted;
    });
  },

  async update(
    id: string,
    input: TutorUpdateInput,
    opts: { actor: Actor },
  ): Promise<Tutor> {
    const validated = tutorUpdateSchema.parse(input);
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    for (const [k, v] of Object.entries(validated)) {
      if (v !== undefined) updates[k] = v;
    }

    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(tutors)
        .where(and(eq(tutors.id, id), isNull(tutors.deletedAt)))
        .limit(1);
      if (!existing) throw new NotFoundError("Tutor not found");

      const [updated] = await tx
        .update(tutors)
        .set(updates)
        .where(eq(tutors.id, id))
        .returning();
      if (!updated) throw new Error("Failed to update tutor");

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "tutor.updated",
          entityType: "Tutor",
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
    input: TutorStatusUpdateInput,
    opts: { actor: Actor },
  ): Promise<Tutor> {
    const validated = tutorStatusUpdateSchema.parse(input);
    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(tutors)
        .where(and(eq(tutors.id, validated.tutorId), isNull(tutors.deletedAt)))
        .limit(1);
      if (!existing) throw new NotFoundError("Tutor not found");

      const [updated] = await tx
        .update(tutors)
        .set({ status: validated.status, updatedAt: new Date() })
        .where(eq(tutors.id, validated.tutorId))
        .returning();
      if (!updated) throw new Error("Failed to update tutor status");

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "tutor.status.updated",
          entityType: "Tutor",
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
        .from(tutors)
        .where(and(eq(tutors.id, id), isNull(tutors.deletedAt)))
        .limit(1);
      if (!existing) throw new NotFoundError("Tutor not found");

      await tx
        .update(tutors)
        .set({ deletedAt: new Date() })
        .where(eq(tutors.id, id));

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "tutor.deleted",
          entityType: "Tutor",
          entityId: id,
        },
        tx,
      );
    });
  },
};
