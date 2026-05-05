"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { logger } from "@/lib/logger";
import {
  AUTOMATION_MODES,
  WORKFLOW_STEPS,
  automationService,
} from "@/lib/services/automationService";
import { AppError } from "@/lib/utils/errors";

/**
 * Build a flat allow-list of every valid workflow-step key (e.g. "lead.scoring")
 * from the typed WORKFLOW_STEPS tree. Anything not in this list is rejected by
 * the action — typo-safe and prevents writing arbitrary preference rows.
 */
const allWorkflowStepKeys = Object.values(WORKFLOW_STEPS).flatMap((domain) =>
  Object.values(domain),
) as readonly string[];

const stepSchema = z
  .string()
  .refine(
    (s): s is (typeof allWorkflowStepKeys)[number] =>
      allWorkflowStepKeys.includes(s),
    { message: "Unknown workflow step" },
  );

const setModeSchema = z.object({
  workflowStep: stepSchema,
  mode: z.enum(AUTOMATION_MODES),
});

export type SetAutomationModeResult =
  | { ok: true }
  | { ok: false; error: string };

export async function setAutomationModeAction(
  input: unknown,
): Promise<SetAutomationModeResult> {
  const actor = await requireAuth(["OWNER", "ADMIN"]);
  ensure(actor, "automation.update");

  const parsed = setModeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid step or mode" };
  }

  try {
    await automationService.setMode({
      userId: actor.id,
      workflowStep: parsed.data.workflowStep,
      mode: parsed.data.mode,
      actor,
    });
    revalidatePath("/automation-settings");
    return { ok: true };
  } catch (err) {
    logger.warn(
      {
        err,
        userId: actor.id,
        workflowStep: parsed.data.workflowStep,
        mode: parsed.data.mode,
      },
      "setAutomationModeAction failed",
    );
    if (err instanceof AppError) return { ok: false, error: err.message };
    return { ok: false, error: "Could not save preference. Check logs." };
  }
}
