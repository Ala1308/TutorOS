"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { logger } from "@/lib/logger";
import {
  assessmentCreateSchema,
  assessmentUpdateSchema,
} from "@/lib/schemas/academics";
import { assessmentService } from "@/lib/services/assessmentService";
import { AppError } from "@/lib/utils/errors";

const idSchema = z.string().uuid();

export type AssessmentMutationResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

const ROLES = ["OWNER", "ADMIN", "ACADEMIC_MANAGER", "TUTOR"] as const;

export async function createAssessmentAction(
  input: unknown,
): Promise<AssessmentMutationResult> {
  const actor = await requireAuth([...ROLES]);
  ensure(actor, "assessment.create");

  const parsed = assessmentCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid assessment",
    };
  }

  try {
    const row = await assessmentService.create(parsed.data, { actor });
    revalidatePath("/academics/assessments");
    revalidatePath(`/students/${row.studentId}`);
    revalidatePath("/audit-log");
    return { ok: true, id: row.id };
  } catch (err) {
    logger.warn({ err }, "createAssessmentAction failed");
    if (err instanceof AppError) return { ok: false, error: err.message };
    return { ok: false, error: "Could not create assessment. Check logs." };
  }
}

export async function updateAssessmentAction(
  id: unknown,
  input: unknown,
): Promise<AssessmentMutationResult> {
  const actor = await requireAuth([...ROLES]);
  ensure(actor, "assessment.update");

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Invalid id" };

  const parsed = assessmentUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid assessment",
    };
  }

  try {
    const row = await assessmentService.update(parsedId.data, parsed.data, {
      actor,
    });
    revalidatePath("/academics/assessments");
    revalidatePath(`/academics/assessments/${parsedId.data}`);
    revalidatePath(`/students/${row.studentId}`);
    revalidatePath("/audit-log");
    return { ok: true };
  } catch (err) {
    logger.warn({ err, id: parsedId.data }, "updateAssessmentAction failed");
    if (err instanceof AppError) return { ok: false, error: err.message };
    return { ok: false, error: "Could not update assessment. Check logs." };
  }
}

export async function deleteAssessmentAction(id: unknown): Promise<void> {
  const actor = await requireAuth(["OWNER", "ADMIN"]);
  ensure(actor, "assessment.delete");

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return;

  try {
    await assessmentService.softDelete(parsedId.data, { actor });
    revalidatePath("/academics/assessments");
    revalidatePath("/audit-log");
  } catch (err) {
    logger.warn({ err, id: parsedId.data }, "deleteAssessmentAction failed");
    return;
  }
  redirect("/academics/assessments?deleted=1");
}
