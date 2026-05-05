"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { inngest } from "@/lib/inngest/client";
import { logger } from "@/lib/logger";
import { approvalService } from "@/lib/services/approvalService";
import { leadScoringService } from "@/lib/services/leadScoringService";
import { AppError, ValidationError } from "@/lib/utils/errors";

import type { ApprovalRequest } from "@/lib/db/schema";

/**
 * Emit the Inngest event matching the resolved approval's status so any
 * `step.waitForEvent` workflow subscribing on `event.data.approvalId` un-blocks.
 *
 * `inngest.send` is overloaded per-event-name (the data shape is narrowed by
 * the literal `name`). A `switch` keeps each `name` a literal type so the
 * payload type-check fires correctly. Statuses without a corresponding event
 * (PENDING, EXPIRED) intentionally fall through silently.
 */
async function emitApprovalEvent(approval: ApprovalRequest): Promise<void> {
  const data = { approvalId: approval.id };
  switch (approval.status) {
    case "APPROVED":
      await inngest.send({ name: "approval.approved", data });
      return;
    case "REJECTED":
      await inngest.send({ name: "approval.rejected", data });
      return;
    case "CHANGES_REQUESTED":
      await inngest.send({ name: "approval.changes_requested", data });
      return;
  }
}

/**
 * Dispatcher: maps an approval's `proposedAction` to the service that knows
 * how to apply it. Add a case here whenever a new agent starts proposing
 * actions for human approval.
 *
 * Throws ValidationError on unknown actions so we never silently no-op.
 */
async function applyApprovedProposal(args: {
  approval: ApprovalRequest;
  actor: Awaited<ReturnType<typeof requireAuth>>;
}): Promise<void> {
  switch (args.approval.proposedAction) {
    case "lead.setScore":
      await leadScoringService.applyApprovedScore({
        approval: args.approval,
        actor: args.actor,
      });
      return;
    default:
      throw new ValidationError(
        `No handler registered for proposedAction "${args.approval.proposedAction}"`,
      );
  }
}

const resolveSchema = z.object({
  approvalId: z.string().uuid(),
  decision: z.enum(["APPROVED", "REJECTED", "CHANGES_REQUESTED"]),
  reviewNotes: z.string().max(5000).optional(),
});

export type ResolveApprovalResult =
  | { ok: true; status: ApprovalRequest["status"]; applied: boolean }
  | { ok: false; error: string };

export async function resolveApprovalAction(
  input: unknown,
): Promise<ResolveApprovalResult> {
  const actor = await requireAuth(["OWNER", "ADMIN"]);
  ensure(actor, "approval.resolve");

  const parsed = resolveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input" };
  }

  try {
    // Resolve first so we lock the approval atomically (and prevent double-apply).
    // approvalService.resolve enforces the PENDING precondition inside its txn.
    const updated = await approvalService.resolve(
      {
        approvalId: parsed.data.approvalId,
        decision: parsed.data.decision,
        ...(parsed.data.reviewNotes !== undefined
          ? { reviewNotes: parsed.data.reviewNotes }
          : {}),
      },
      { actor },
    );

    let applied = false;
    if (updated.status === "APPROVED") {
      await applyApprovedProposal({ approval: updated, actor });
      applied = true;
    }

    // Notify any waiting Inngest workflow. We send AFTER the proposed action
    // is applied so a workflow that re-reads the entity sees the new state.
    // Best-effort: a send failure must not roll back the human decision.
    try {
      await emitApprovalEvent(updated);
    } catch (sendErr) {
      logger.warn(
        { err: sendErr, approvalId: updated.id, status: updated.status },
        "Failed to emit inngest approval event (workflow may stall until 7d timeout)",
      );
    }

    revalidatePath("/approvals");
    revalidatePath("/audit-log");
    if (updated.entityType === "Lead") {
      revalidatePath(`/leads/${updated.entityId}`);
      revalidatePath("/leads");
    }

    return { ok: true, status: updated.status, applied };
  } catch (err) {
    logger.warn(
      {
        err,
        approvalId: parsed.data.approvalId,
        decision: parsed.data.decision,
        actorId: actor.id,
      },
      "resolveApprovalAction failed",
    );
    if (err instanceof AppError) return { ok: false, error: err.message };
    return { ok: false, error: "Failed to resolve approval. Check logs." };
  }
}
