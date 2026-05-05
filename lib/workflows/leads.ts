import { SYSTEM_ACTOR } from "@/lib/auth/types";
import { inngest } from "@/lib/inngest/client";
import { logger } from "@/lib/logger";
import {
  WORKFLOW_STEPS,
  automationService,
} from "@/lib/services/automationService";
import { leadScoringService } from "@/lib/services/leadScoringService";
import { leadService } from "@/lib/services/leadService";

/**
 * Lead workflow:
 *
 *   lead.created
 *     → check automation mode for lead.scoring
 *     → leadScoringService.runForLead (handles APPLY vs APPROVAL routing)
 *     → if approval was raised: wait for approval.approved with that ID (7d timeout)
 *     → re-load the lead (its score may have just been applied via approval)
 *     → if score >= 70, emit lead.qualified
 *
 * Each step is named, idempotent, and short. Heavy work (LLM call, DB writes)
 * happens inside step.run, so retries hit the durable Inngest checkpoint
 * rather than rerunning the whole function.
 */

const LEAD_QUALIFIED_THRESHOLD = 70;

export const onLeadCreated = inngest.createFunction(
  { id: "on-lead-created", retries: 3 },
  { event: "lead.created" },
  async ({ event, step }) => {
    const leadId = event.data.leadId;

    // Workflow runs as SYSTEM. The per-user automation prefs page only
    // affects manually-clicked Run buttons. Workflow-initiated scoring
    // honours the system-default mode (DRAFT_ONLY today). When we add a
    // team-level pref later, swap getMode("system", ...) for getSystemMode().
    const mode = await step.run("load-system-automation-mode", () =>
      automationService.getMode(SYSTEM_ACTOR.id, WORKFLOW_STEPS.lead.scoring),
    );

    if (mode === "MANUAL") {
      logger.info({ leadId }, "lead.scoring is MANUAL — workflow skipped");
      return { status: "skipped", reason: "manual_mode" };
    }

    // Delegate to the same service the lead detail page uses. This is the
    // single source of truth for the score-or-approval routing.
    const result = await step.run("run-lead-scoring", () =>
      leadScoringService.runForLead({ leadId, actor: SYSTEM_ACTOR }),
    );

    // APPLY path — the score is already on the lead row.
    if (result.decision.kind === "APPLY") {
      const score = result.decision.payload.score;
      if (score >= LEAD_QUALIFIED_THRESHOLD) {
        await step.sendEvent("emit-lead-qualified", {
          name: "lead.qualified",
          data: { leadId, score },
        });
      }
      return {
        status: "completed",
        path: "auto_applied",
        agentRunId: result.agentRun.agentRunId,
        score,
      };
    }

    // APPROVAL path — score NOT yet on the lead. Wait for the human.
    if (result.decision.kind === "APPROVAL" && result.approval) {
      const approvalId = result.approval.id;

      const approvedEvent = await step.waitForEvent("wait-for-approval", {
        event: "approval.approved",
        timeout: "7d",
        if: `event.data.approvalId == "${approvalId}"`,
      });

      if (!approvedEvent) {
        logger.warn(
          { leadId, approvalId },
          "Lead-scoring approval timed out after 7d",
        );
        return { status: "approval_timeout", approvalId };
      }

      // Score has been applied by approvalService → leadScoringService.
      // Re-load to get the freshly-applied score.
      const updated = await step.run("reload-lead-after-approval", () =>
        leadService.getOrThrow(leadId),
      );

      if (updated.score != null && updated.score >= LEAD_QUALIFIED_THRESHOLD) {
        await step.sendEvent("emit-lead-qualified", {
          name: "lead.qualified",
          data: { leadId, score: updated.score },
        });
      }

      return {
        status: "completed",
        path: "approved_by_human",
        agentRunId: result.agentRun.agentRunId,
        approvalId,
        score: updated.score,
      };
    }

    // Defensive — leadScoringService.runForLead throws on BLOCKED_MANUAL,
    // which we already short-circuited above. Anything else is a bug.
    logger.error(
      { leadId, decision: result.decision.kind },
      "Unexpected leadScoring decision in workflow",
    );
    return { status: "unexpected_decision", kind: result.decision.kind };
  },
);
