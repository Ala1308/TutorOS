import { google } from "googleapis";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { googleTokens } from "@/lib/db/schema";
import { env, integrations } from "@/lib/env";

/**
 * Per-user Google OAuth client. Auto-refreshes tokens.
 *
 * If the user has not linked Google, callers should detect this via
 * `unavailable: true` rather than throwing — UI degrades gracefully.
 */
export type GoogleClientResult =
  | { unavailable: true; reason: "google_not_configured" | "google_not_linked" }
  | { unavailable: false; oauth2: import("google-auth-library").OAuth2Client };

export async function getGoogleClient(
  userId: string,
): Promise<GoogleClientResult> {
  if (!integrations.hasGoogleOAuth()) {
    return { unavailable: true, reason: "google_not_configured" };
  }

  const [row] = await db
    .select()
    .from(googleTokens)
    .where(eq(googleTokens.userId, userId))
    .limit(1);

  if (!row) {
    return { unavailable: true, reason: "google_not_linked" };
  }

  // TODO: decrypt with TOKEN_ENCRYPTION_KEY before passing to Google.
  // Stubbed for now — fill in lib/google/crypto.ts when wiring auth.
  const oauth2 = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );
  oauth2.setCredentials({
    access_token: row.accessTokenEncrypted,
    refresh_token: row.refreshTokenEncrypted,
    scope: row.scope,
    token_type: row.tokenType,
    expiry_date: row.expiresAt.getTime(),
  });

  return { unavailable: false, oauth2 };
}
