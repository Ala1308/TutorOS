"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { logger } from "@/lib/logger";
import { studentCreateSchema, studentUpdateSchema } from "@/lib/schemas/people";
import { studentService } from "@/lib/services/studentService";
import { AppError } from "@/lib/utils/errors";

const idSchema = z.string().uuid();

export type StudentMutationResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

export async function createStudentAction(
  input: unknown,
): Promise<StudentMutationResult> {
  const actor = await requireAuth(["OWNER", "ADMIN", "ACADEMIC_MANAGER"]);
  ensure(actor, "student.create");

  const parsed = studentCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid student" };
  }

  try {
    const row = await studentService.create(parsed.data, { actor });
    revalidatePath("/students");
    revalidatePath(`/parents/${row.parentId}`);
    revalidatePath("/audit-log");
    return { ok: true, id: row.id };
  } catch (err) {
    logger.warn({ err }, "createStudentAction failed");
    if (err instanceof AppError) return { ok: false, error: err.message };
    return { ok: false, error: "Could not create student. Check logs." };
  }
}

export async function updateStudentAction(
  id: unknown,
  input: unknown,
): Promise<StudentMutationResult> {
  const actor = await requireAuth(["OWNER", "ADMIN", "ACADEMIC_MANAGER"]);
  ensure(actor, "student.update");

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Invalid id" };

  const parsed = studentUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid student" };

  try {
    const updated = await studentService.update(parsedId.data, parsed.data, {
      actor,
    });
    revalidatePath("/students");
    revalidatePath(`/students/${parsedId.data}`);
    revalidatePath(`/parents/${updated.parentId}`);
    revalidatePath("/audit-log");
    return { ok: true };
  } catch (err) {
    logger.warn({ err, id: parsedId.data }, "updateStudentAction failed");
    if (err instanceof AppError) return { ok: false, error: err.message };
    return { ok: false, error: "Could not update student. Check logs." };
  }
}

export async function deleteStudentAction(id: unknown): Promise<void> {
  const actor = await requireAuth(["OWNER", "ADMIN"]);
  ensure(actor, "student.delete");

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return;

  try {
    await studentService.softDelete(parsedId.data, { actor });
    revalidatePath("/students");
    revalidatePath("/audit-log");
  } catch (err) {
    logger.warn({ err, id: parsedId.data }, "deleteStudentAction failed");
    return;
  }
  redirect("/students?deleted=1");
}
