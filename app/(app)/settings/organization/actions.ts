"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { logger } from "@/lib/logger";
import {
  orgProfileSchema,
  orgProfileService,
} from "@/lib/services/orgProfileService";
import { AppError } from "@/lib/utils/errors";

export type SaveOrgProfileResult = { ok: true } | { ok: false; error: string };

export async function saveOrgProfileAction(
  input: unknown,
): Promise<SaveOrgProfileResult> {
  const actor = await requireAuth(["OWNER", "ADMIN"]);
  ensure(actor, "org.profile.write");

  const parsed = orgProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid org profile" };
  }

  try {
    await orgProfileService.update(parsed.data, { actor });
    revalidatePath("/settings/organization");
    revalidatePath("/audit-log");
    return { ok: true };
  } catch (err) {
    logger.warn({ err }, "saveOrgProfileAction failed");
    if (err instanceof AppError) return { ok: false, error: err.message };
    return { ok: false, error: "Could not save organization. Check logs." };
  }
}
