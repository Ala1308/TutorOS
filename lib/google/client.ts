import { google } from "googleapis";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { googleTokens } from "@/lib/db/schema";
import { env, integrations } from "@/lib/env";
import { decryptSecret } from "@/lib/google/crypto";
import { ExternalServiceError } from "@/lib/utils/errors";

/**
 * Per-user Google OAuth client. Auto-refreshes tokens via google-auth-library.
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

  const key = env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
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

  let access: string;
  let refresh: string;
  try {
    access = decryptSecret(row.accessTokenEncrypted, key);
    refresh = decryptSecret(row.refreshTokenEncrypted, key);
  } catch {
    throw new ExternalServiceError(
      "google",
      "Stored Google tokens could not be decrypted — reconnect Google in settings.",
    );
  }

  const oauth2 = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );
  oauth2.setCredentials({
    access_token: access,
    refresh_token: refresh,
    scope: row.scope,
    token_type: row.tokenType,
    expiry_date: row.expiresAt.getTime(),
  });

  return { unavailable: false, oauth2 };
}
