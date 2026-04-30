import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  approvalRequests,
  type ApprovalRequest,
  type NewApprovalRequest,
} from "@/lib/db/schema";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/utils/errors";

import type { Actor } from "@/lib/auth/types";
import type { RiskLevel } from "@/lib/ai/types";

import { auditService } from "./auditService";

const createSchema = z.object({
  agentRunId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  proposedAction: z.string().min(1).max(200),
  proposedPayload: z.unknown(),
  currentState: z.unknown().optional(),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  expiresAt: z.date().optional(),
});

type CreateInput = z.infer<typeof createSchema>;

const resolveSchema = z.object({
  approvalId: z.string().uuid(),
  decision: z.enum(["APPROVED", "REJECTED", "CHANGES_REQUESTED"]),
  reviewNotes: z.string().max(5000).optional(),
});

export type ApprovalDecision = z.infer<typeof resolveSchema>["decision"];

export const approvalService = {
  async create(
    input: CreateInput,
    opts: { actor: Actor },
  ): Promise<ApprovalRequest> {
    const validated = createSchema.parse(input);

    const row: NewApprovalRequest = {
      ...(validated.agentRunId ? { agentRunId: validated.agentRunId } : {}),
      title: validated.title,
      description: validated.description,
      entityType: validated.entityType,
      entityId: validated.entityId,
      proposedAction: validated.proposedAction,
      proposedPayload: validated.proposedPayload as unknown,
      ...(validated.currentState !== undefined
        ? { currentState: validated.currentState as unknown }
        : {}),
      riskLevel: validated.riskLevel as RiskLevel,
      ...(validated.expiresAt ? { expiresAt: validated.expiresAt } : {}),
      status: "PENDING",
    };

    return db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(approvalRequests)
        .values(row)
        .returning();
      if (!inserted) throw new Error("Failed to create approval");

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "approval.created",
          entityType: "ApprovalRequest",
          entityId: inserted.id,
          ...(validated.agentRunId ? { agentRunId: validated.agentRunId } : {}),
          metadata: {
            proposedAction: validated.proposedAction,
            riskLevel: validated.riskLevel,
            entity: { type: validated.entityType, id: validated.entityId },
          },
        },
        tx,
      );

      return inserted;
    });
  },

  async resolve(
    input: z.infer<typeof resolveSchema>,
    opts: { actor: Actor },
  ): Promise<ApprovalRequest> {
    const validated = resolveSchema.parse(input);

    if (opts.actor.type !== "USER") {
      throw new ForbiddenError("Only human users can resolve approvals");
    }
    if (validated.decision === "REJECTED" && !validated.reviewNotes) {
      throw new ValidationError("Rejection requires review notes");
    }

    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(approvalRequests)
        .where(eq(approvalRequests.id, validated.approvalId))
        .limit(1);

      if (!existing) throw new NotFoundError("Approval not found");
      if (existing.status !== "PENDING") {
        throw new ValidationError(`Approval already ${existing.status}`);
      }

      const status =
        validated.decision === "APPROVED"
          ? "APPROVED"
          : validated.decision === "REJECTED"
            ? "REJECTED"
            : "CHANGES_REQUESTED";

      const [updated] = await tx
        .update(approvalRequests)
        .set({
          status,
          reviewedById: opts.actor.id,
          reviewedAt: new Date(),
          ...(validated.reviewNotes
            ? { reviewNotes: validated.reviewNotes }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(approvalRequests.id, validated.approvalId))
        .returning();
      if (!updated) throw new Error("Failed to update approval");

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: `approval.${status.toLowerCase()}`,
          entityType: "ApprovalRequest",
          entityId: updated.id,
          metadata: { reviewNotes: validated.reviewNotes },
        },
        tx,
      );

      return updated;
    });
  },

  async get(id: string): Promise<ApprovalRequest | null> {
    const [row] = await db
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.id, id))
      .limit(1);
    return row ?? null;
  },

  async listPending(limit = 50): Promise<ApprovalRequest[]> {
    return db
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.status, "PENDING"))
      .orderBy(desc(approvalRequests.createdAt))
      .limit(limit);
  },

  async listForEntity(entityType: string, entityId: string) {
    return db
      .select()
      .from(approvalRequests)
      .where(
        and(
          eq(approvalRequests.entityType, entityType),
          eq(approvalRequests.entityId, entityId),
        ),
      )
      .orderBy(desc(approvalRequests.createdAt));
  },
};
