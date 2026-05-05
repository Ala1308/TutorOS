import { google } from "googleapis";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { env, integrations } from "@/lib/env";
import { GOOGLE_OAUTH_SCOPES } from "@/lib/google/constants";
import { signOAuthState } from "@/lib/google/oauthState";

/**
 * Starts the Google OAuth install flow. Requires a logged-in OWNER or ADMIN.
 * Redirects to Google's consent screen, then back to /api/google/oauth/callback.
 */
export async function GET() {
  const base = env.NEXT_PUBLIC_APP_URL;

  if (!integrations.hasGoogleOAuth()) {
    return NextResponse.redirect(
      new URL(
        "/settings/integrations/google?error=google_not_configured",
        base,
      ),
    );
  }

  const actor = await getCurrentUser();
  if (!actor || actor.type !== "USER") {
    return NextResponse.redirect(
      new URL(
        `/login?next=${encodeURIComponent("/settings/integrations/google")}`,
        base,
      ),
    );
  }

  ensure(actor, "integration.google.link");

  const oauth2 = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );

  const state = signOAuthState(actor.id, env.TOKEN_ENCRYPTION_KEY!);

  const url = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [...GOOGLE_OAUTH_SCOPES],
    state,
    include_granted_scopes: true,
  });

  return NextResponse.redirect(url);
}
