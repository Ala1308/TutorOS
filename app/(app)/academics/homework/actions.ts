"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { logger } from "@/lib/logger";
import {
  HOMEWORK_STATUS_VALUES,
  homeworkCreateSchema,
  homeworkStatusSchema,
  homeworkUpdateSchema,
} from "@/lib/schemas/academics";
import { homeworkService } from "@/lib/services/homeworkService";
import { AppError } from "@/lib/utils/errors";

const idSchema = z.string().uuid();
const statusSchema = z.enum(HOMEWORK_STATUS_VALUES);

export type HomeworkMutationResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

const ROLES = ["OWNER", "ADMIN", "ACADEMIC_MANAGER", "TUTOR"] as const;

export async function createHomeworkAction(
  input: unknown,
): Promise<HomeworkMutationResult> {
  const actor = await requireAuth([...ROLES]);
  ensure(actor, "homework.create");

  const parsed = homeworkCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid homework",
    };
  }

  try {
    const row = await homeworkService.create(parsed.data, { actor });
    revalidatePath("/academics/homework");
    revalidatePath(`/students/${row.studentId}`);
    revalidatePath("/audit-log");
    return { ok: true, id: row.id };
  } catch (err) {
    logger.warn({ err }, "createHomeworkAction failed");
    if (err instanceof AppError) return { ok: false, error: err.message };
    return { ok: false, error: "Could not create homework. Check logs." };
  }
}

export async function updateHomeworkAction(
  id: unknown,
  input: unknown,
): Promise<HomeworkMutationResult> {
  const actor = await requireAuth([...ROLES]);
  ensure(actor, "homework.update");

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Invalid id" };

  const parsed = homeworkUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid homework",
    };
  }

  try {
    const row = await homeworkService.update(parsedId.data, parsed.data, {
      actor,
    });
    revalidatePath("/academics/homework");
    revalidatePath(`/academics/homework/${parsedId.data}`);
    revalidatePath(`/students/${row.studentId}`);
    revalidatePath("/audit-log");
    return { ok: true };
  } catch (err) {
    logger.warn({ err, id: parsedId.data }, "updateHomeworkAction failed");
    if (err instanceof AppError) return { ok: false, error: err.message };
    return { ok: false, error: "Could not update homework. Check logs." };
  }
}

export async function setHomeworkStatusAction(input: {
  homeworkId: unknown;
  status: unknown;
  submissionUrl?: string | null;
  submissionNotes?: string | null;
  grade?: string | null;
  scorePercent?: number | null;
  feedback?: string | null;
}): Promise<HomeworkMutationResult> {
  const actor = await requireAuth([
    "OWNER",
    "ADMIN",
    "ACADEMIC_MANAGER",
    "TUTOR",
    "PARENT",
  ]);
  const parsedId = idSchema.safeParse(input.homeworkId);
  const parsedStatus = statusSchema.safeParse(input.status);
  if (!parsedId.success || !parsedStatus.success) {
    return { ok: false, error: "Invalid input" };
  }

  ensure(actor, "homework.status.update");
  // Tutors / managers may grade & review; parents/students may only submit.
  if (
    parsedStatus.data === "REVIEWED" ||
    parsedStatus.data === "COMPLETED" ||
    parsedStatus.data === "MISSED"
  ) {
    ensure(actor, "homework.update");
  }

  const merged = {
    homeworkId: parsedId.data,
    status: parsedStatus.data,
    ...(input.submissionUrl ? { submissionUrl: input.submissionUrl } : {}),
    ...(input.submissionNotes
      ? { submissionNotes: input.submissionNotes }
      : {}),
    ...(input.grade ? { grade: input.grade } : {}),
    ...(input.scorePercent != null ? { scorePercent: input.scorePercent } : {}),
    ...(input.feedback ? { feedback: input.feedback } : {}),
  };

  const parsedAll = homeworkStatusSchema.safeParse(merged);
  if (!parsedAll.success) {
    return {
      ok: false,
      error: parsedAll.error.issues[0]?.message ?? "Invalid status payload",
    };
  }

  try {
    await homeworkService.setStatus(parsedAll.data, { actor });
    revalidatePath("/academics/homework");
    revalidatePath(`/academics/homework/${parsedId.data}`);
    revalidatePath("/audit-log");
    return { ok: true };
  } catch (err) {
    logger.warn({ err, id: parsedId.data }, "setHomeworkStatusAction failed");
    if (err instanceof AppError) return { ok: false, error: err.message };
    return { ok: false, error: "Could not update status. Check logs." };
  }
}

export async function deleteHomeworkAction(id: unknown): Promise<void> {
  const actor = await requireAuth(["OWNER", "ADMIN"]);
  ensure(actor, "homework.delete");

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return;

  try {
    await homeworkService.softDelete(parsedId.data, { actor });
    revalidatePath("/academics/homework");
    revalidatePath("/audit-log");
  } catch (err) {
    logger.warn({ err, id: parsedId.data }, "deleteHomeworkAction failed");
    return;
  }
  redirect("/academics/homework?deleted=1");
}
