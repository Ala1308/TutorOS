"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { inngest } from "@/lib/inngest/client";
import { logger } from "@/lib/logger";
import { leadCreateSchema } from "@/lib/schemas/lead";
import { leadScoringService } from "@/lib/services/leadScoringService";
import { leadService } from "@/lib/services/leadService";
import { AppError } from "@/lib/utils/errors";

export async function createLeadAction(input: unknown) {
  const actor = await requireAuth(["OWNER", "ADMIN", "ACADEMIC_MANAGER"]);
  ensure(actor, "lead.create");

  const validated = leadCreateSchema.parse(input);
  const lead = await leadService.create(validated, { actor });

  await inngest.send({
    name: "lead.created",
    data: { leadId: lead.id },
  });

  revalidatePath("/leads");
  return { ok: true, id: lead.id };
}

export async function updateLeadStatusAction(input: {
  leadId: string;
  status:
    | "NEW"
    | "CONTACTED"
    | "QUALIFIED"
    | "DISQUALIFIED"
    | "CONVERTED"
    | "ARCHIVED";
}) {
  const actor = await requireAuth(["OWNER", "ADMIN", "ACADEMIC_MANAGER"]);
  ensure(actor, "lead.update");

  const updated = await leadService.updateStatus(input, { actor });
  revalidatePath(`/leads/${updated.id}`);
  revalidatePath("/leads");
  return { ok: true };
}

const runLeadScoringInput = z.object({ leadId: z.string().uuid() });

export type RunLeadScoringActionResult =
  | {
      ok: true;
      kind: "APPLY";
      score: number;
      agentRunId: string;
    }
  | {
      ok: true;
      kind: "APPROVAL";
      score: number;
      agentRunId: string;
      approvalId: string;
    }
  | { ok: false; error: string };

export async function runLeadScoringAction(
  input: unknown,
): Promise<RunLeadScoringActionResult> {
  const actor = await requireAuth(["OWNER", "ADMIN", "ACADEMIC_MANAGER"]);
  ensure(actor, "agent.run");
  ensure(actor, "lead.score");

  const parsed = runLeadScoringInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid lead id" };

  try {
    const result = await leadScoringService.runForLead({
      leadId: parsed.data.leadId,
      actor,
    });
    revalidatePath(`/leads/${parsed.data.leadId}`);
    revalidatePath("/leads");
    revalidatePath("/agent-runs");
    revalidatePath("/audit-log");
    revalidatePath("/approvals");

    if (result.decision.kind === "APPLY") {
      return {
        ok: true,
        kind: "APPLY",
        score: result.decision.payload.score,
        agentRunId: result.agentRun.agentRunId,
      };
    }
    if (result.decision.kind === "APPROVAL" && result.approval) {
      return {
        ok: true,
        kind: "APPROVAL",
        score: result.decision.payload.score,
        agentRunId: result.agentRun.agentRunId,
        approvalId: result.approval.id,
      };
    }
    return { ok: false, error: "Lead scoring decision was not actionable" };
  } catch (err) {
    logger.warn(
      { err, leadId: parsed.data.leadId, actorId: actor.id },
      "runLeadScoringAction failed",
    );
    if (err instanceof AppError) return { ok: false, error: err.message };
    return { ok: false, error: "Lead scoring failed. Check server logs." };
  }
}
