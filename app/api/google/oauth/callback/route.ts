import { google } from "googleapis";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { env, integrations } from "@/lib/env";
import { verifyOAuthState } from "@/lib/google/oauthState";
import { googleTokenService } from "@/lib/services/googleTokenService";
import { AppError } from "@/lib/utils/errors";
import { logger } from "@/lib/logger";

/**
 * Google OAuth callback — exchanges `code` for tokens, encrypts at rest,
 * upserts `google_tokens`, audits, redirects back to settings.
 */
export async function GET(req: NextRequest) {
  const base = env.NEXT_PUBLIC_APP_URL;
  const settingsUrl = new URL("/settings/integrations/google", base);

  try {
    if (!integrations.hasGoogleOAuth()) {
      settingsUrl.searchParams.set("error", "google_not_configured");
      return NextResponse.redirect(settingsUrl);
    }

    const url = new URL(req.url);
    const oauthError = url.searchParams.get("error");
    if (oauthError) {
      settingsUrl.searchParams.set("error", oauthError);
      return NextResponse.redirect(settingsUrl);
    }

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const verified = verifyOAuthState(state, env.TOKEN_ENCRYPTION_KEY!);

    if (!code || !verified) {
      settingsUrl.searchParams.set("error", "invalid_oauth");
      return NextResponse.redirect(settingsUrl);
    }

    const oauth2 = new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_REDIRECT_URI,
    );

    const { tokens } = await oauth2.getToken(code);

    const [userRow] = await db
      .select()
      .from(users)
      .where(eq(users.id, verified.userId))
      .limit(1);

    if (!userRow) {
      logger.warn(
        { userId: verified.userId },
        "OAuth state referenced unknown users row",
      );
      settingsUrl.searchParams.set("error", "user_not_found");
      return NextResponse.redirect(settingsUrl);
    }

    await googleTokenService.upsertFromCredentials({
      userId: verified.userId,
      credentials: tokens,
      actor: {
        type: "USER",
        id: userRow.id,
        role: userRow.role,
        email: userRow.email,
      },
    });

    settingsUrl.searchParams.set("connected", "1");
    return NextResponse.redirect(settingsUrl);
  } catch (err) {
    logger.warn({ err }, "Google OAuth callback failed");
    const msg = err instanceof AppError ? err.message : "oauth_callback_failed";
    settingsUrl.searchParams.set("error", msg.slice(0, 200));
    return NextResponse.redirect(settingsUrl);
  }
}
