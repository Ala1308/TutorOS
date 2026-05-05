import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { parents, type NewParent, type Parent } from "@/lib/db/schema";
import {
  parentCreateSchema,
  parentUpdateSchema,
  type ParentCreateInput,
  type ParentUpdateInput,
} from "@/lib/schemas/people";
import { NotFoundError } from "@/lib/utils/errors";

import type { Actor } from "@/lib/auth/types";

import { auditService } from "./auditService";

export const parentService = {
  async list(
    args: { limit?: number; offset?: number } = {},
  ): Promise<Parent[]> {
    const limit = Math.min(args.limit ?? 50, 100);
    const offset = args.offset ?? 0;
    return db
      .select()
      .from(parents)
      .where(isNull(parents.deletedAt))
      .orderBy(desc(parents.createdAt))
      .limit(limit)
      .offset(offset);
  },

  async get(id: string): Promise<Parent | null> {
    const [row] = await db
      .select()
      .from(parents)
      .where(and(eq(parents.id, id), isNull(parents.deletedAt)))
      .limit(1);
    return row ?? null;
  },

  async getOrThrow(id: string): Promise<Parent> {
    const row = await this.get(id);
    if (!row) throw new NotFoundError("Parent not found");
    return row;
  },

  async create(
    input: ParentCreateInput,
    opts: { actor: Actor },
  ): Promise<Parent> {
    const validated = parentCreateSchema.parse(input);
    const row: NewParent = {
      fullName: validated.fullName,
      email: validated.email,
      ...(validated.phone ? { phone: validated.phone } : {}),
      ...(validated.timezone ? { timezone: validated.timezone } : {}),
      ...(validated.notes ? { notes: validated.notes } : {}),
    };

    return db.transaction(async (tx) => {
      const [inserted] = await tx.insert(parents).values(row).returning();
      if (!inserted) throw new Error("Failed to insert parent");

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "parent.created",
          entityType: "Parent",
          entityId: inserted.id,
          metadata: { email: inserted.email },
        },
        tx,
      );

      return inserted;
    });
  },

  async update(
    id: string,
    input: ParentUpdateInput,
    opts: { actor: Actor },
  ): Promise<Parent> {
    const validated = parentUpdateSchema.parse(input);
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    for (const [k, v] of Object.entries(validated)) {
      if (v !== undefined) updates[k] = v;
    }

    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(parents)
        .where(and(eq(parents.id, id), isNull(parents.deletedAt)))
        .limit(1);
      if (!existing) throw new NotFoundError("Parent not found");

      const [updated] = await tx
        .update(parents)
        .set(updates)
        .where(eq(parents.id, id))
        .returning();
      if (!updated) throw new Error("Failed to update parent");

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "parent.updated",
          entityType: "Parent",
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
        .from(parents)
        .where(and(eq(parents.id, id), isNull(parents.deletedAt)))
        .limit(1);
      if (!existing) throw new NotFoundError("Parent not found");

      await tx
        .update(parents)
        .set({ deletedAt: new Date() })
        .where(eq(parents.id, id));

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "parent.deleted",
          entityType: "Parent",
          entityId: id,
        },
        tx,
      );
    });
  },
};
