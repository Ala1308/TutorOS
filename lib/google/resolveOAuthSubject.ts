import { z } from "zod";

import type { ToolContext } from "@/lib/ai/types";
import { ForbiddenError, ValidationError } from "@/lib/utils/errors";

/**
 * Which TutorOS `users.id` row owns the Google OAuth tokens for this tool call.
 *
 * - **USER** actors always use their own tokens — `googleOAuthUserId` must not
 *   point at another user (spoofing guard).
 * - **SYSTEM** / **AGENT** actors must pass `googleOAuthUserId` explicitly — that
 *   is the operator whose Drive link should be used (workflows choose this).
 */
export function resolveGoogleOAuthSubject(ctx: ToolContext): string {
  if (ctx.actor.type === "USER") {
    if (
      ctx.googleOAuthUserId !== undefined &&
      ctx.googleOAuthUserId !== ctx.actor.id
    ) {
      throw new ForbiddenError(
        "Cannot run Google actions as another user's OAuth identity",
      );
    }
    return ctx.actor.id;
  }

  if (ctx.actor.type === "SYSTEM" || ctx.actor.type === "AGENT") {
    const id = ctx.googleOAuthUserId;
    if (!id || !z.string().uuid().safeParse(id).success) {
      throw new ValidationError(
        "Google Drive tools require googleOAuthUserId when actor is not a USER",
      );
    }
    return id;
  }

  throw new ValidationError("Unsupported actor type for Google Drive");
}
