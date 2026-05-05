"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { logger } from "@/lib/logger";
import {
  TUTOR_STATUS_VALUES,
  tutorCreateSchema,
  tutorUpdateSchema,
} from "@/lib/schemas/people";
import { tutorService } from "@/lib/services/tutorService";
import { AppError } from "@/lib/utils/errors";

const idSchema = z.string().uuid();
const statusSchema = z.enum(TUTOR_STATUS_VALUES);

export type TutorMutationResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

export async function createTutorAction(
  input: unknown,
): Promise<TutorMutationResult> {
  const actor = await requireAuth(["OWNER", "ADMIN", "ACADEMIC_MANAGER"]);
  ensure(actor, "tutor.create");

  const parsed = tutorCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid tutor" };
  }

  try {
    const row = await tutorService.create(parsed.data, { actor });
    revalidatePath("/tutors");
    revalidatePath("/audit-log");
    return { ok: true, id: row.id };
  } catch (err) {
    logger.warn({ err }, "createTutorAction failed");
    if (err instanceof AppError) return { ok: false, error: err.message };
    return { ok: false, error: "Could not create tutor. Check logs." };
  }
}

export async function updateTutorAction(
  id: unknown,
  input: unknown,
): Promise<TutorMutationResult> {
  const actor = await requireAuth(["OWNER", "ADMIN", "ACADEMIC_MANAGER"]);
  ensure(actor, "tutor.update");

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Invalid id" };

  const parsed = tutorUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid tutor" };

  try {
    await tutorService.update(parsedId.data, parsed.data, { actor });
    revalidatePath("/tutors");
    revalidatePath(`/tutors/${parsedId.data}`);
    revalidatePath("/audit-log");
    return { ok: true };
  } catch (err) {
    logger.warn({ err, id: parsedId.data }, "updateTutorAction failed");
    if (err instanceof AppError) return { ok: false, error: err.message };
    return { ok: false, error: "Could not update tutor. Check logs." };
  }
}

export async function setTutorStatusAction(input: {
  tutorId: unknown;
  status: unknown;
}): Promise<TutorMutationResult> {
  const actor = await requireAuth(["OWNER", "ADMIN", "ACADEMIC_MANAGER"]);
  ensure(actor, "tutor.status.update");

  const parsedId = idSchema.safeParse(input.tutorId);
  const parsedStatus = statusSchema.safeParse(input.status);
  if (!parsedId.success || !parsedStatus.success) {
    return { ok: false, error: "Invalid input" };
  }

  try {
    await tutorService.setStatus(
      { tutorId: parsedId.data, status: parsedStatus.data },
      { actor },
    );
    revalidatePath("/tutors");
    revalidatePath(`/tutors/${parsedId.data}`);
    revalidatePath("/audit-log");
    return { ok: true };
  } catch (err) {
    logger.warn({ err, tutorId: parsedId.data }, "setTutorStatusAction failed");
    if (err instanceof AppError) return { ok: false, error: err.message };
    return { ok: false, error: "Could not update status. Check logs." };
  }
}

export async function deleteTutorAction(id: unknown): Promise<void> {
  const actor = await requireAuth(["OWNER", "ADMIN"]);
  ensure(actor, "tutor.delete");

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return;

  try {
    await tutorService.softDelete(parsedId.data, { actor });
    revalidatePath("/tutors");
    revalidatePath("/audit-log");
  } catch (err) {
    logger.warn({ err, id: parsedId.data }, "deleteTutorAction failed");
    return;
  }
  redirect("/tutors?deleted=1");
}
