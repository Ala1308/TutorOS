import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { automationPreferences } from "@/lib/db/schema";
import { ForbiddenError } from "@/lib/utils/errors";

import type { Actor } from "@/lib/auth/types";
import type { AutomationLevel } from "@/lib/ai/types";

import { auditService } from "./auditService";

/**
 * Per-user, per-step automation preference.
 *
 * Workflow step keys use dot notation: <domain>.<step>. Add new keys to
 * `WORKFLOW_STEPS` so typos surface at compile time.
 */
export const WORKFLOW_STEPS = {
  lead: {
    scoring: "lead.scoring",
    acknowledgmentEmail: "lead.acknowledgmentEmail",
    intakeFormSend: "lead.intakeFormSend",
  },
  intake: {
    studentProfileCreation: "intake.studentProfileCreation",
  },
  assessment: {
    generation: "assessment.generation",
    sendToStudent: "assessment.sendToStudent",
    grading: "assessment.grading",
  },
  learningPlan: {
    generation: "learningPlan.generation",
    activation: "learningPlan.activation",
  },
  tutor: {
    screening: "tutor.screening",
    testGeneration: "tutor.testGeneration",
    matching: "tutor.matching",
    assignment: "tutor.assignment",
  },
  session: {
    scheduling: "session.scheduling",
    prepGeneration: "session.prepGeneration",
    transcriptAnalysis: "session.transcriptAnalysis",
    parentUpdate: "session.parentUpdate",
  },
  homework: {
    generation: "homework.generation",
    send: "homework.send",
  },
  invoice: {
    generation: "invoice.generation",
    send: "invoice.send",
  },
  payout: {
    draft: "payout.draft",
    finalize: "payout.finalize",
  },
  drive: {
    createFolder: "drive.createFolder",
    uploadFile: "drive.uploadFile",
  },
  comm: {
    logEmail: "comm.logEmail",
    logCall: "comm.logCall",
  },
} as const;

/**
 * Steps that are too risky to auto-execute. Setting FULL_AUTO on these
 * is rejected by `setMode` and the option is hidden in the UI.
 *
 * Exported (read-only) so the UI can disable the FULL_AUTO option for
 * these steps instead of letting users discover the rule by getting an
 * error after submit.
 */
export const HIGH_RISK_STEPS: ReadonlySet<string> = new Set<string>([
  WORKFLOW_STEPS.lead.acknowledgmentEmail,
  WORKFLOW_STEPS.assessment.sendToStudent,
  WORKFLOW_STEPS.learningPlan.activation,
  WORKFLOW_STEPS.tutor.assignment,
  WORKFLOW_STEPS.session.parentUpdate,
  WORKFLOW_STEPS.homework.send,
  WORKFLOW_STEPS.invoice.send,
  WORKFLOW_STEPS.payout.finalize,
]);

export function isHighRiskStep(step: string): boolean {
  return HIGH_RISK_STEPS.has(step);
}

export const AUTOMATION_MODES = [
  "MANUAL",
  "DRAFT_ONLY",
  "AUTO_AFTER_APPROVAL",
  "FULL_AUTO",
] as const satisfies ReadonlyArray<AutomationLevel>;

export const DEFAULT_AUTOMATION_MODE: AutomationLevel = "DRAFT_ONLY";

export const automationService = {
  /** Returns the user's mode for a step, or the global default. */
  async getMode(
    userId: string,
    workflowStep: string,
  ): Promise<AutomationLevel> {
    const [row] = await db
      .select({ mode: automationPreferences.mode })
      .from(automationPreferences)
      .where(
        and(
          eq(automationPreferences.userId, userId),
          eq(automationPreferences.workflowStep, workflowStep),
        ),
      )
      .limit(1);
    return (row?.mode as AutomationLevel) ?? DEFAULT_AUTOMATION_MODE;
  },

  /**
   * Returns a Map<step, mode> for every step the user has explicitly set.
   * Cheaper than calling getMode() once per workflow step on a settings page.
   */
  async getAllForUser(userId: string): Promise<Map<string, AutomationLevel>> {
    const rows = await db
      .select({
        workflowStep: automationPreferences.workflowStep,
        mode: automationPreferences.mode,
      })
      .from(automationPreferences)
      .where(eq(automationPreferences.userId, userId));
    const m = new Map<string, AutomationLevel>();
    for (const r of rows) m.set(r.workflowStep, r.mode as AutomationLevel);
    return m;
  },

  async setMode(args: {
    userId: string;
    workflowStep: string;
    mode: AutomationLevel;
    actor: Actor;
  }): Promise<void> {
    if (args.mode === "FULL_AUTO" && HIGH_RISK_STEPS.has(args.workflowStep)) {
      throw new ForbiddenError(
        `Step ${args.workflowStep} cannot be set to FULL_AUTO`,
      );
    }

    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(automationPreferences)
        .where(
          and(
            eq(automationPreferences.userId, args.userId),
            eq(automationPreferences.workflowStep, args.workflowStep),
          ),
        )
        .limit(1);

      if (existing) {
        await tx
          .update(automationPreferences)
          .set({ mode: args.mode, updatedAt: new Date() })
          .where(eq(automationPreferences.id, existing.id));
      } else {
        await tx.insert(automationPreferences).values({
          userId: args.userId,
          workflowStep: args.workflowStep,
          mode: args.mode,
        });
      }

      await auditService.logAuditEvent(
        {
          actorType: args.actor.type,
          actorId: args.actor.id,
          action: "automation.preference.updated",
          entityType: "AutomationPreference",
          entityId: `${args.userId}:${args.workflowStep}`,
          metadata: { mode: args.mode, previousMode: existing?.mode },
        },
        tx,
      );
    });
  },

  async listForUser(userId: string) {
    return db
      .select()
      .from(automationPreferences)
      .where(eq(automationPreferences.userId, userId));
  },
};
