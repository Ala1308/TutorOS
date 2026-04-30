import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { leads, type Lead, type NewLead } from "@/lib/db/schema";
import {
  leadCreateSchema,
  leadUpdateStatusSchema,
  type LeadCreateInput,
} from "@/lib/schemas/lead";
import { ConsentBlockedError, NotFoundError } from "@/lib/utils/errors";

import type { Actor } from "@/lib/auth/types";
import type { RiskLevel } from "@/lib/ai/types";

import { auditService } from "./auditService";

export const leadService = {
  async create(input: LeadCreateInput, opts: { actor: Actor }): Promise<Lead> {
    const validated = leadCreateSchema.parse(input);

    if (!validated.consentDataProcessing) {
      throw new ConsentBlockedError(
        "DATA_PROCESSING",
        "Cannot create lead without data processing consent",
      );
    }

    const row: NewLead = {
      parentName: validated.parentName,
      parentEmail: validated.parentEmail,
      ...(validated.parentPhone ? { parentPhone: validated.parentPhone } : {}),
      studentGrade: validated.studentGrade,
      subjectNeeded: validated.subjectNeeded,
      ...(validated.message ? { message: validated.message } : {}),
      source: validated.source,
      consentDataProcessing: validated.consentDataProcessing,
    };

    return db.transaction(async (tx) => {
      const [inserted] = await tx.insert(leads).values(row).returning();
      if (!inserted) throw new Error("Failed to insert lead");

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "lead.created",
          entityType: "Lead",
          entityId: inserted.id,
          metadata: {
            source: validated.source,
            subjectNeeded: validated.subjectNeeded,
          },
        },
        tx,
      );

      return inserted;
    });
  },

  async get(id: string): Promise<Lead | null> {
    const [row] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, id), isNull(leads.deletedAt)))
      .limit(1);
    return row ?? null;
  },

  async getOrThrow(id: string): Promise<Lead> {
    const row = await this.get(id);
    if (!row) throw new NotFoundError("Lead not found");
    return row;
  },

  async list(args: { limit?: number; offset?: number } = {}) {
    const limit = Math.min(args.limit ?? 25, 100);
    const offset = args.offset ?? 0;
    return db
      .select()
      .from(leads)
      .where(isNull(leads.deletedAt))
      .orderBy(desc(leads.createdAt))
      .limit(limit)
      .offset(offset);
  },

  async setScore(args: {
    leadId: string;
    score: number;
    riskLevel: RiskLevel;
    riskFlags: string[];
    reasoning: string;
    actor: Actor;
    agentRunId?: string;
  }): Promise<Lead> {
    return db.transaction(async (tx) => {
      const [updated] = await tx
        .update(leads)
        .set({
          score: Math.round(args.score),
          riskLevel: args.riskLevel,
          riskFlags: args.riskFlags,
          scoringReasoning: args.reasoning,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, args.leadId))
        .returning();
      if (!updated) throw new NotFoundError("Lead not found");

      await auditService.logAuditEvent(
        {
          actorType: args.actor.type,
          actorId: args.actor.id,
          action: "lead.scored",
          entityType: "Lead",
          entityId: updated.id,
          ...(args.agentRunId ? { agentRunId: args.agentRunId } : {}),
          metadata: {
            score: args.score,
            riskLevel: args.riskLevel,
            riskFlags: args.riskFlags,
          },
        },
        tx,
      );
      return updated;
    });
  },

  async updateStatus(
    input: { leadId: string; status: Lead["status"] },
    opts: { actor: Actor },
  ): Promise<Lead> {
    const validated = leadUpdateStatusSchema.parse(input);

    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(leads)
        .where(eq(leads.id, validated.leadId))
        .limit(1);
      if (!existing) throw new NotFoundError("Lead not found");

      const [updated] = await tx
        .update(leads)
        .set({ status: validated.status, updatedAt: new Date() })
        .where(eq(leads.id, validated.leadId))
        .returning();
      if (!updated) throw new Error("Update failed");

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "lead.status.updated",
          entityType: "Lead",
          entityId: updated.id,
          metadata: { from: existing.status, to: validated.status },
        },
        tx,
      );
      return updated;
    });
  },
};
