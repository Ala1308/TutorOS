"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { logger } from "@/lib/logger";
import { parentCreateSchema, parentUpdateSchema } from "@/lib/schemas/people";
import { parentService } from "@/lib/services/parentService";
import { AppError } from "@/lib/utils/errors";

const idSchema = z.string().uuid();

export type ParentMutationResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

export async function createParentAction(
  input: unknown,
): Promise<ParentMutationResult> {
  const actor = await requireAuth(["OWNER", "ADMIN", "ACADEMIC_MANAGER"]);
  ensure(actor, "parent.create");

  const parsed = parentCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid parent" };
  }

  try {
    const row = await parentService.create(parsed.data, { actor });
    revalidatePath("/parents");
    revalidatePath("/audit-log");
    return { ok: true, id: row.id };
  } catch (err) {
    logger.warn({ err }, "createParentAction failed");
    if (err instanceof AppError) return { ok: false, error: err.message };
    return { ok: false, error: "Could not create parent. Check logs." };
  }
}

export async function updateParentAction(
  id: unknown,
  input: unknown,
): Promise<ParentMutationResult> {
  const actor = await requireAuth(["OWNER", "ADMIN", "ACADEMIC_MANAGER"]);
  ensure(actor, "parent.update");

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Invalid id" };

  const parsed = parentUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid parent" };

  try {
    await parentService.update(parsedId.data, parsed.data, { actor });
    revalidatePath("/parents");
    revalidatePath(`/parents/${parsedId.data}`);
    revalidatePath("/audit-log");
    return { ok: true };
  } catch (err) {
    logger.warn({ err, id: parsedId.data }, "updateParentAction failed");
    if (err instanceof AppError) return { ok: false, error: err.message };
    return { ok: false, error: "Could not update parent. Check logs." };
  }
}

export async function deleteParentAction(id: unknown): Promise<void> {
  const actor = await requireAuth(["OWNER", "ADMIN"]);
  ensure(actor, "parent.delete");

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return;

  try {
    await parentService.softDelete(parsedId.data, { actor });
    revalidatePath("/parents");
    revalidatePath("/audit-log");
  } catch (err) {
    logger.warn({ err, id: parsedId.data }, "deleteParentAction failed");
    return;
  }
  redirect("/parents?deleted=1");
}
