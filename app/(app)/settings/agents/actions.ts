"use server";

import { revalidatePath } from "next/cache";

import "@/lib/ai/registry.bootstrap";
import { listAgents } from "@/lib/ai/registry";
import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { logger } from "@/lib/logger";
import {
  agentSettingsService,
  agentSettingsUpdateSchema,
} from "@/lib/services/agentSettingsService";
import { AppError, ValidationError } from "@/lib/utils/errors";

export type SaveAgentSettingsResult =
  | { ok: true; promptVersion: number }
  | { ok: false; error: string };

export async function saveAgentSettingsAction(
  agentName: string,
  input: unknown,
): Promise<SaveAgentSettingsResult> {
  const actor = await requireAuth(["OWNER", "ADMIN"]);
  ensure(actor, "agent.settings.write");

  const known = new Set(listAgents().map((a) => a.name));
  if (!known.has(agentName)) {
    return { ok: false, error: "Unknown agent" };
  }

  const parsed = agentSettingsUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid agent settings" };
  }

  try {
    const row = await agentSettingsService.upsert(agentName, parsed.data, {
      actor,
    });
    revalidatePath("/settings/agents");
    revalidatePath("/audit-log");
    return { ok: true, promptVersion: row.promptVersion };
  } catch (err) {
    logger.warn({ err, agentName }, "saveAgentSettingsAction failed");
    if (err instanceof ValidationError) {
      return { ok: false, error: err.message };
    }
    if (err instanceof AppError) return { ok: false, error: err.message };
    return { ok: false, error: "Could not save settings. Check logs." };
  }
}
