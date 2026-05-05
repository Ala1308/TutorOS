import "server-only";
import "@/lib/ai/registry.bootstrap";

import { z } from "zod";

import { runAgent } from "@/lib/ai/runAgent";
import {
  type LeadScoringInput,
  type LeadScoringOutput,
} from "@/lib/ai/schemas/leadScoring";
import { ConsentBlockedError, ValidationError } from "@/lib/utils/errors";

import type { Actor } from "@/lib/auth/types";
import type {
  AgentRunResult,
  AutomationLevel,
  RiskLevel,
} from "@/lib/ai/types";
import type { ApprovalRequest, Lead } from "@/lib/db/schema";

import { approvalService } from "./approvalService";
import { automationService } from "./automationService";
import { leadService } from "./leadService";

/**
 * Orchestrates the lead-scoring workflow:
 *   1. Loads the lead.
 *   2. Asserts data-processing consent (no AI on a lead that hasn't consented).
 *   3. Calls `runAgent("leadScoring", ...)` which persists an AgentRun row.
 *   4. Reads the user's automation preference for `lead.scoring`.
 *   5. Either applies the score directly OR raises an ApprovalRequest.
 *
 * The "decide" step is split into a pure function (`decideLeadScoringOutcome`)
 * so it can be unit-tested without a DB or LLM.
 */

export type LeadScoringScorePayload = {
  score: number;
  riskLevel: RiskLevel;
  riskFlags: string[];
  reasoning: string;
};

export type LeadScoringDecision =
  | { kind: "APPLY"; payload: LeadScoringScorePayload }
  | {
      kind: "APPROVAL";
      payload: LeadScoringScorePayload;
      reason:
        | "agent_low_confidence_or_high_risk"
        | "automation_draft_only"
        | "automation_auto_after_approval";
    }
  | { kind: "BLOCKED_MANUAL" };

/** Pure decision: which outcome should we take? */
export function decideLeadScoringOutcome(args: {
  agentSaysApproval: boolean;
  mode: AutomationLevel;
  payload: LeadScoringScorePayload;
}): LeadScoringDecision {
  if (args.mode === "MANUAL") return { kind: "BLOCKED_MANUAL" };

  if (args.mode === "FULL_AUTO" && !args.agentSaysApproval) {
    return { kind: "APPLY", payload: args.payload };
  }

  if (args.agentSaysApproval) {
    return {
      kind: "APPROVAL",
      payload: args.payload,
      reason: "agent_low_confidence_or_high_risk",
    };
  }

  if (args.mode === "DRAFT_ONLY") {
    return {
      kind: "APPROVAL",
      payload: args.payload,
      reason: "automation_draft_only",
    };
  }

  // mode === AUTO_AFTER_APPROVAL
  return {
    kind: "APPROVAL",
    payload: args.payload,
    reason: "automation_auto_after_approval",
  };
}

export type RunLeadScoringResult = {
  agentRun: AgentRunResult<LeadScoringOutput>;
  decision: LeadScoringDecision;
  lead: Lead;
  approval?: ApprovalRequest;
};

export const leadScoringService = {
  async runForLead(args: {
    leadId: string;
    actor: Actor;
  }): Promise<RunLeadScoringResult> {
    const lead = await leadService.getOrThrow(args.leadId);

    if (!lead.consentDataProcessing) {
      throw new ConsentBlockedError(
        "DATA_PROCESSING",
        "Cannot score lead without data-processing consent",
      );
    }

    const mode = await automationService.getMode(args.actor.id, "lead.scoring");
    if (mode === "MANUAL") {
      throw new ValidationError(
        "Lead scoring is set to MANUAL for your account. Change it in /automation-settings to run agents.",
      );
    }

    const input: LeadScoringInput = {
      parentName: lead.parentName,
      parentEmail: lead.parentEmail ?? null,
      parentPhone: lead.parentPhone ?? null,
      studentGrade: lead.studentGrade ?? null,
      subjectNeeded: lead.subjectNeeded ?? null,
      message: lead.message ?? null,
      source: lead.source,
    };

    const agentRun = await runAgent<LeadScoringInput, LeadScoringOutput>({
      agentName: "leadScoring",
      input,
      context: {
        actor: args.actor,
        triggerSource: "manual",
        entityType: "Lead",
        entityId: lead.id,
      },
    });

    if (!agentRun.output) {
      // runAgent throws on failure; this guards the type system.
      throw new ValidationError("Agent returned no output");
    }

    const out = agentRun.output;
    const payload: LeadScoringScorePayload = {
      score: out.score,
      riskLevel: out.riskLevel as RiskLevel,
      riskFlags: out.riskFlags,
      reasoning: out.reasoning,
    };

    const decision = decideLeadScoringOutcome({
      agentSaysApproval: agentRun.requiresApproval,
      mode,
      payload,
    });

    if (decision.kind === "APPLY") {
      const updated = await leadService.setScore({
        leadId: lead.id,
        score: payload.score,
        riskLevel: payload.riskLevel,
        riskFlags: payload.riskFlags,
        reasoning: payload.reasoning,
        actor: args.actor,
        agentRunId: agentRun.agentRunId,
      });
      return { agentRun, decision, lead: updated };
    }

    if (decision.kind === "APPROVAL") {
      const approval = await approvalService.create(
        {
          agentRunId: agentRun.agentRunId,
          title: `Apply lead score: ${payload.score}/100`,
          description: payload.reasoning,
          entityType: "Lead",
          entityId: lead.id,
          proposedAction: "lead.setScore",
          proposedPayload: payload,
          currentState: {
            score: lead.score,
            riskLevel: lead.riskLevel,
            riskFlags: lead.riskFlags ?? [],
            reasoning: lead.scoringReasoning,
          },
          riskLevel: payload.riskLevel,
        },
        { actor: args.actor },
      );
      return { agentRun, decision, lead, approval };
    }

    // decision.kind === BLOCKED_MANUAL — already short-circuited above, but keep
    // the exhaustive check so future modes don't slip through silently.
    throw new ValidationError("Unhandled lead-scoring decision");
  },

  /**
   * Apply a previously-approved `lead.setScore` proposal. Called from the
   * approvals dispatcher when a human resolves an approval as APPROVED.
   * The proposed payload is re-validated to defend against tampering between
   * approval-creation and approval-resolution.
   */
  async applyApprovedScore(args: {
    approval: ApprovalRequest;
    actor: Actor;
  }): Promise<Lead> {
    if (args.approval.entityType !== "Lead") {
      throw new ValidationError(
        `applyApprovedScore: expected entityType=Lead, got ${args.approval.entityType}`,
      );
    }
    if (args.approval.proposedAction !== "lead.setScore") {
      throw new ValidationError(
        `applyApprovedScore: expected proposedAction=lead.setScore, got ${args.approval.proposedAction}`,
      );
    }

    const payload = leadScoringScorePayloadSchema.parse(
      args.approval.proposedPayload,
    );

    return leadService.setScore({
      leadId: args.approval.entityId,
      score: payload.score,
      riskLevel: payload.riskLevel,
      riskFlags: payload.riskFlags,
      reasoning: payload.reasoning,
      actor: args.actor,
      ...(args.approval.agentRunId
        ? { agentRunId: args.approval.agentRunId }
        : {}),
    });
  },
};

/** Defensive runtime schema for the JSON payload stored on the approval row. */
const leadScoringScorePayloadSchema = z.object({
  score: z.number().int().min(0).max(100),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  riskFlags: z.array(z.string()),
  reasoning: z.string().min(1),
});
