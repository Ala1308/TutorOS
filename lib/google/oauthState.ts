import crypto from "node:crypto";

/** OAuth `state` max age — prevents replay of captured URLs. */
export const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;

interface OAuthStateEnvelope {
  userId: string;
  ts: number;
  n: string;
  sig: string;
}

function stateSigningKey(secret: string): Buffer {
  return crypto
    .createHash("sha256")
    .update(`oauth-state:${secret}`, "utf8")
    .digest();
}

function bodyForSig(userId: string, ts: number, n: string): string {
  return `${userId}|${ts}|${n}`;
}

/**
 * Encode a signed OAuth `state` carrying the TutorOS user id (UUID).
 * Signed with TOKEN_ENCRYPTION_KEY so state can't be forged without DB secrets.
 */
export function signOAuthState(userId: string, secret: string): string {
  const payload = {
    userId,
    ts: Date.now(),
    n: crypto.randomBytes(16).toString("hex"),
  };
  const key = stateSigningKey(secret);
  const sig = crypto
    .createHmac("sha256", key)
    .update(bodyForSig(payload.userId, payload.ts, payload.n))
    .digest("base64url");
  const envelope: OAuthStateEnvelope = { ...payload, sig };
  return Buffer.from(JSON.stringify(envelope)).toString("base64url");
}

/** Verify and decode OAuth `state`. Returns null if invalid or expired. */
export function verifyOAuthState(
  state: string | null,
  secret: string,
): { userId: string } | null {
  if (!state) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(state, "base64url").toString("utf8"),
    ) as OAuthStateEnvelope;
    const { sig, userId, ts, n } = parsed;
    if (
      typeof sig !== "string" ||
      typeof userId !== "string" ||
      typeof ts !== "number" ||
      typeof n !== "string"
    ) {
      return null;
    }
    const key = stateSigningKey(secret);
    const expected = crypto
      .createHmac("sha256", key)
      .update(bodyForSig(userId, ts, n))
      .digest("base64url");
    const sigBuf = Buffer.from(sig, "base64url");
    const expBuf = Buffer.from(expected, "base64url");
    if (
      sigBuf.length !== expBuf.length ||
      !crypto.timingSafeEqual(sigBuf, expBuf)
    ) {
      return null;
    }
    if (Date.now() - ts > OAUTH_STATE_MAX_AGE_MS) return null;
    return { userId };
  } catch {
    return null;
  }
}
