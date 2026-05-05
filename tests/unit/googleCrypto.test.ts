import { describe, expect, it } from "vitest";

import { decryptSecret, encryptSecret } from "@/lib/google/crypto";
import {
  OAUTH_STATE_MAX_AGE_MS,
  signOAuthState,
  verifyOAuthState,
} from "@/lib/google/oauthState";

describe("lib/google/crypto", () => {
  it("round-trips arbitrary UTF-8", () => {
    const secret = "unit-test-secret-key-is-long-enough!";
    const plain = "café token 🔑";
    expect(decryptSecret(encryptSecret(plain, secret), secret)).toBe(plain);
  });

  it("produces different ciphertext each time (random IV)", () => {
    const secret = "another-secret-key-for-testing!!";
    const a = encryptSecret("same", secret);
    const b = encryptSecret("same", secret);
    expect(a).not.toBe(b);
    expect(decryptSecret(a, secret)).toBe("same");
    expect(decryptSecret(b, secret)).toBe("same");
  });

  it("fails decrypt with wrong key", () => {
    const enc = encryptSecret("x", "key-one-is-long-enough-for-hash!!");
    expect(() =>
      decryptSecret(enc, "key-two-is-long-enough-for-hash!!"),
    ).toThrow();
  });
});

describe("lib/google/oauthState", () => {
  const secret = "oauth-state-test-secret-key-long!!";

  it("round-trips userId", () => {
    const state = signOAuthState(
      "00000000-0000-4000-8000-000000000001",
      secret,
    );
    expect(verifyOAuthState(state, secret)?.userId).toBe(
      "00000000-0000-4000-8000-000000000001",
    );
  });

  it("rejects tampered state", () => {
    const state = signOAuthState(
      "00000000-0000-4000-8000-000000000001",
      secret,
    );
    const tampered = state.slice(0, -4) + "XXXX";
    expect(verifyOAuthState(tampered, secret)).toBeNull();
  });

  it("rejects null state and documents max age", () => {
    expect(OAUTH_STATE_MAX_AGE_MS).toBe(600_000);
    expect(verifyOAuthState(null, secret)).toBeNull();
    expect(verifyOAuthState("", secret)).toBeNull();
  });
});
