import { runAgent } from "@/lib/ai/runAgent";
import "@/lib/ai/registry.bootstrap";
import { inngest } from "@/lib/inngest/client";
import { logger } from "@/lib/logger";
import { approvalService } from "@/lib/services/approvalService";
import {
  automationService,
  WORKFLOW_STEPS,
} from "@/lib/services/automationService";
import { leadService } from "@/lib/services/leadService";
import { SYSTEM_ACTOR } from "@/lib/auth/types";

/**
 * Lead workflow:
 *   lead.created → leadScoring agent → set score on lead
 *                                    → if requires approval, create one + wait
 *                                    → emit lead.qualified when score ≥ threshold
 *
 * Each step is named, idempotent, and short.
 */
export const onLeadCreated = inngest.createFunction(
  { id: "on-lead-created", retries: 3 },
  { event: "lead.created" },
  async ({ event, step }) => {
    const lead = await step.run("load-lead", () =>
      leadService.getOrThrow(event.data.leadId),
    );

    // The system "owns" workflow runs in MVP; per-user automation modes are
    // checked against a known operator id once auth is wired.
    const mode = await step.run("load-automation-mode", () =>
      automationService.getMode(SYSTEM_ACTOR.id, WORKFLOW_STEPS.lead.scoring),
    );

    if (mode === "MANUAL") {
      logger.info({ leadId: lead.id }, "Lead scoring set to MANUAL — skipping");
      return { status: "skipped", reason: "manual_mode" };
    }

    const result = await step.run("run-lead-scoring-agent", () =>
      runAgent<
        unknown,
        {
          score: number;
          riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
          riskFlags: string[];
          reasoning: string;
          confidence: number;
          requiresHumanApproval: boolean;
        }
      >({
        agentName: "leadScoring",
        input: {
          parentName: lead.parentName,
          parentEmail: lead.parentEmail,
          parentPhone: lead.parentPhone,
          studentGrade: lead.studentGrade,
          subjectNeeded: lead.subjectNeeded,
          message: lead.message,
          source: lead.source,
        },
        context: {
          actor: SYSTEM_ACTOR,
          triggerSource: "workflow",
          entityType: "Lead",
          entityId: lead.id,
        },
      }),
    );

    if (!result.output) {
      return { status: "failed", reason: "no_output" };
    }

    await step.run("apply-lead-score", () =>
      leadService.setScore({
        leadId: lead.id,
        score: result.output!.score,
        riskLevel: result.output!.riskLevel,
        riskFlags: result.output!.riskFlags,
        reasoning: result.output!.reasoning,
        actor: SYSTEM_ACTOR,
        agentRunId: result.agentRunId,
      }),
    );

    if (result.requiresApproval) {
      const approval = await step.run("create-approval", () =>
        approvalService.create(
          {
            agentRunId: result.agentRunId,
            title: `Confirm lead score for ${lead.parentName}`,
            description: result.output!.reasoning,
            entityType: "Lead",
            entityId: lead.id,
            proposedAction: "lead.confirmScore",
            proposedPayload: result.output,
            currentState: { score: lead.score, status: lead.status },
            riskLevel: result.output!.riskLevel,
          },
          { actor: SYSTEM_ACTOR },
        ),
      );

      const approved = await step.waitForEvent("wait-for-approval", {
        event: "approval.approved",
        timeout: "7d",
        if: `event.data.approvalId == "${approval.id}"`,
      });

      if (!approved) return { status: "approval_timeout" };
    }

    if (result.output.score >= 70) {
      await step.sendEvent("emit-lead-qualified", {
        name: "lead.qualified",
        data: { leadId: lead.id, score: result.output.score },
      });
    }

    return { status: "completed", agentRunId: result.agentRunId };
  },
);
