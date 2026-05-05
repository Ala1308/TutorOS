"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { logger } from "@/lib/logger";
import {
  SESSION_STATUS_VALUES,
  sessionCreateSchema,
  sessionUpdateSchema,
} from "@/lib/schemas/session";
import { invoiceService } from "@/lib/services/invoiceService";
import { sessionService } from "@/lib/services/sessionService";
import { AppError } from "@/lib/utils/errors";

const idSchema = z.string().uuid();
const statusSchema = z.enum(SESSION_STATUS_VALUES);

export type SessionMutationResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

export async function createSessionAction(
  input: unknown,
): Promise<SessionMutationResult> {
  const actor = await requireAuth(["OWNER", "ADMIN", "ACADEMIC_MANAGER"]);
  ensure(actor, "session.create");

  const parsed = sessionCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid session",
    };
  }

  try {
    const row = await sessionService.create(parsed.data, { actor });
    revalidatePath("/sessions");
    revalidatePath(`/students/${row.studentId}`);
    revalidatePath(`/tutors/${row.tutorId}`);
    revalidatePath("/audit-log");
    return { ok: true, id: row.id };
  } catch (err) {
    logger.warn({ err }, "createSessionAction failed");
    if (err instanceof AppError) return { ok: false, error: err.message };
    return { ok: false, error: "Could not create session. Check logs." };
  }
}

export async function updateSessionAction(
  id: unknown,
  input: unknown,
): Promise<SessionMutationResult> {
  const actor = await requireAuth(["OWNER", "ADMIN", "ACADEMIC_MANAGER"]);
  ensure(actor, "session.update");

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Invalid id" };

  const parsed = sessionUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid session",
    };
  }

  try {
    const row = await sessionService.update(parsedId.data, parsed.data, {
      actor,
    });
    revalidatePath("/sessions");
    revalidatePath(`/sessions/${parsedId.data}`);
    revalidatePath(`/students/${row.studentId}`);
    revalidatePath(`/tutors/${row.tutorId}`);
    revalidatePath("/audit-log");
    return { ok: true };
  } catch (err) {
    logger.warn({ err, id: parsedId.data }, "updateSessionAction failed");
    if (err instanceof AppError) return { ok: false, error: err.message };
    return { ok: false, error: "Could not update session. Check logs." };
  }
}

export async function setSessionStatusAction(input: {
  sessionId: unknown;
  status: unknown;
}): Promise<SessionMutationResult> {
  const actor = await requireAuth([
    "OWNER",
    "ADMIN",
    "ACADEMIC_MANAGER",
    "TUTOR",
  ]);
  const parsedStatus = statusSchema.safeParse(input.status);
  const parsedId = idSchema.safeParse(input.sessionId);
  if (!parsedId.success || !parsedStatus.success) {
    return { ok: false, error: "Invalid input" };
  }

  if (parsedStatus.data === "CANCELED") {
    ensure(actor, "session.cancel");
  } else if (parsedStatus.data === "COMPLETED") {
    ensure(actor, "session.complete");
  } else {
    ensure(actor, "session.update");
  }

  try {
    await sessionService.setStatus(
      { sessionId: parsedId.data, status: parsedStatus.data },
      { actor },
    );
    revalidatePath("/sessions");
    revalidatePath(`/sessions/${parsedId.data}`);
    revalidatePath("/audit-log");
    return { ok: true };
  } catch (err) {
    logger.warn(
      { err, sessionId: parsedId.data },
      "setSessionStatusAction failed",
    );
    if (err instanceof AppError) return { ok: false, error: err.message };
    return { ok: false, error: "Could not update status. Check logs." };
  }
}

/**
 * Drafts an invoice from a single session and redirects to it. Operators can
 * then review, tweak, send. Always uses CAD by default — adjust on the
 * invoice itself when needed.
 */
export async function billSessionAction(sessionId: unknown): Promise<void> {
  const actor = await requireAuth(["OWNER", "ADMIN", "ACADEMIC_MANAGER"]);
  ensure(actor, "invoice.create");

  const parsedId = idSchema.safeParse(sessionId);
  if (!parsedId.success) return;

  let createdId: string | undefined;
  try {
    const inv = await invoiceService.createDraftFromSession(
      { sessionId: parsedId.data },
      { actor },
    );
    createdId = inv.id;
    revalidatePath("/invoices");
    revalidatePath(`/sessions/${parsedId.data}`);
    revalidatePath("/audit-log");
  } catch (err) {
    logger.warn({ err, sessionId: parsedId.data }, "billSessionAction failed");
    return;
  }
  if (createdId) redirect(`/invoices/${createdId}`);
}

export async function deleteSessionAction(id: unknown): Promise<void> {
  const actor = await requireAuth(["OWNER", "ADMIN"]);
  ensure(actor, "session.delete");

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return;

  try {
    await sessionService.softDelete(parsedId.data, { actor });
    revalidatePath("/sessions");
    revalidatePath("/audit-log");
  } catch (err) {
    logger.warn({ err, id: parsedId.data }, "deleteSessionAction failed");
    return;
  }
  redirect("/sessions?deleted=1");
}
