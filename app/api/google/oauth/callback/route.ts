import { type NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/utils/errors";

/**
 * Google OAuth callback. Wire fully when authentication is implemented:
 *   1. Validate `state` against the user session.
 *   2. Exchange `code` for tokens via google.auth.OAuth2.getToken.
 *   3. Encrypt tokens with TOKEN_ENCRYPTION_KEY (lib/google/crypto.ts).
 *   4. Upsert google_tokens row for the current user.
 *   5. Audit and redirect.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const _code = url.searchParams.get("code");
    const _state = url.searchParams.get("state");

    return NextResponse.redirect(new URL("/settings", url.origin));
  } catch (err) {
    return handleApiError(err);
  }
}
