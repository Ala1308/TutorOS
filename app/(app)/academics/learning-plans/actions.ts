"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { logger } from "@/lib/logger";
import {
  learningPlanCreateSchema,
  learningPlanUpdateSchema,
} from "@/lib/schemas/academics";
import { learningPlanService } from "@/lib/services/learningPlanService";
import { AppError } from "@/lib/utils/errors";

const idSchema = z.string().uuid();

export type LearningPlanMutationResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

const ROLES = ["OWNER", "ADMIN", "ACADEMIC_MANAGER", "TUTOR"] as const;

export async function createLearningPlanAction(
  input: unknown,
): Promise<LearningPlanMutationResult> {
  const actor = await requireAuth([...ROLES]);
  ensure(actor, "learningPlan.create");

  const parsed = learningPlanCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid learning plan",
    };
  }

  try {
    const row = await learningPlanService.create(parsed.data, { actor });
    revalidatePath("/academics/learning-plans");
    revalidatePath(`/students/${row.studentId}`);
    revalidatePath("/audit-log");
    return { ok: true, id: row.id };
  } catch (err) {
    logger.warn({ err }, "createLearningPlanAction failed");
    if (err instanceof AppError) return { ok: false, error: err.message };
    return { ok: false, error: "Could not create learning plan." };
  }
}

export async function updateLearningPlanAction(
  id: unknown,
  input: unknown,
): Promise<LearningPlanMutationResult> {
  const actor = await requireAuth([...ROLES]);
  ensure(actor, "learningPlan.update");

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Invalid id" };

  const parsed = learningPlanUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid learning plan",
    };
  }

  try {
    const row = await learningPlanService.update(parsedId.data, parsed.data, {
      actor,
    });
    revalidatePath("/academics/learning-plans");
    revalidatePath(`/academics/learning-plans/${parsedId.data}`);
    revalidatePath(`/students/${row.studentId}`);
    revalidatePath("/audit-log");
    return { ok: true };
  } catch (err) {
    logger.warn({ err, id: parsedId.data }, "updateLearningPlanAction failed");
    if (err instanceof AppError) return { ok: false, error: err.message };
    return { ok: false, error: "Could not update learning plan." };
  }
}

export async function deleteLearningPlanAction(id: unknown): Promise<void> {
  const actor = await requireAuth(["OWNER", "ADMIN"]);
  ensure(actor, "learningPlan.delete");

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return;

  try {
    await learningPlanService.softDelete(parsedId.data, { actor });
    revalidatePath("/academics/learning-plans");
    revalidatePath("/audit-log");
  } catch (err) {
    logger.warn({ err, id: parsedId.data }, "deleteLearningPlanAction failed");
    return;
  }
  redirect("/academics/learning-plans?deleted=1");
}
