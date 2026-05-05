"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { logger } from "@/lib/logger";
import { callLogSchema, emailLogSchema } from "@/lib/schemas/comms";
import { commsService } from "@/lib/services/commsService";
import { AppError } from "@/lib/utils/errors";

export type CommMutationResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

export async function logEmailAction(
  input: unknown,
): Promise<CommMutationResult> {
  const actor = await requireAuth(["OWNER", "ADMIN", "ACADEMIC_MANAGER"]);
  ensure(actor, "comm.log");

  const parsed = emailLogSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid email log",
    };
  }

  try {
    const row = await commsService.logEmail(parsed.data, { actor });
    revalidatePath("/communications");
    revalidatePath("/audit-log");
    if (row.entityType && row.entityId) {
      revalidatePath(`/${row.entityType}s/${row.entityId}`);
    }
    return { ok: true, id: row.id };
  } catch (err) {
    logger.warn({ err }, "logEmailAction failed");
    if (err instanceof AppError) return { ok: false, error: err.message };
    return { ok: false, error: "Could not log email. Check logs." };
  }
}

export async function logCallAction(
  input: unknown,
): Promise<CommMutationResult> {
  const actor = await requireAuth(["OWNER", "ADMIN", "ACADEMIC_MANAGER"]);
  ensure(actor, "comm.log");

  const parsed = callLogSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid call log",
    };
  }

  try {
    const row = await commsService.logCall(parsed.data, { actor });
    revalidatePath("/communications");
    revalidatePath("/audit-log");
    if (row.entityType && row.entityId) {
      revalidatePath(`/${row.entityType}s/${row.entityId}`);
    }
    return { ok: true, id: row.id };
  } catch (err) {
    logger.warn({ err }, "logCallAction failed");
    if (err instanceof AppError) return { ok: false, error: err.message };
    return { ok: false, error: "Could not log call. Check logs." };
  }
}
