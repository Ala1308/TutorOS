"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import "@/lib/ai/registry.bootstrap";
import { driveCreateFolderTool } from "@/lib/ai/tools/drive";
import { isApprovalRequired, runTool } from "@/lib/ai/toolRegistry";
import type { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { integrations } from "@/lib/env";
import { googleTokenService } from "@/lib/services/googleTokenService";
import { AppError } from "@/lib/utils/errors";
import { newId } from "@/lib/utils/ids";

export async function disconnectGoogleAction() {
  const actor = await requireAuth(["OWNER", "ADMIN"]);
  ensure(actor, "integration.google.link");

  await googleTokenService.disconnect({ userId: actor.id, actor });
  redirect("/settings/integrations/google?disconnected=1");
}

export type DriveSmokeResult =
  | { ok: true; webViewLink: string }
  | { ok: false; error: string };

/** Creates a throwaway Drive folder via `drive.createFolder` — end-to-end smoke test. */
export async function createDriveSmokeFolderAction(): Promise<DriveSmokeResult> {
  const actor = await requireAuth(["OWNER", "ADMIN"]);
  ensure(actor, "integration.google.link");

  if (!integrations.hasGoogleOAuth()) {
    return { ok: false, error: "Google OAuth is not configured" };
  }

  const summary = await googleTokenService.getSummary(actor.id);
  if (!summary.connected) {
    return { ok: false, error: "Connect Google first" };
  }

  try {
    const out = await runTool<
      z.infer<typeof driveCreateFolderTool.inputSchema>,
      z.infer<typeof driveCreateFolderTool.outputSchema>
    >(
      "drive.createFolder",
      {
        name: `TutorOS smoke ${new Date().toISOString().slice(0, 19)}Z`,
        entityType: "IntegrationSmokeTest",
        entityId: newId(),
      },
      { actor },
    );
    if (isApprovalRequired(out)) {
      // User-actor calls bypass the approval gate; this branch should be
      // unreachable, but TS needs the narrowing.
      return { ok: false, error: "Action requires approval" };
    }
    revalidatePath("/settings/integrations/google");
    revalidatePath("/audit-log");
    return { ok: true, webViewLink: out.webViewLink };
  } catch (err) {
    const msg =
      err instanceof AppError ? err.message : "Drive smoke test failed";
    return { ok: false, error: msg };
  }
}
