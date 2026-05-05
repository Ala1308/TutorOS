import crypto from "node:crypto";

const IV_LENGTH = 12; // GCM standard nonce length
const AUTH_TAG_LENGTH = 16;

function encryptionKey(secret: string): Buffer {
  return crypto.createHash("sha256").update(secret, "utf8").digest();
}

/** Encrypt UTF-8 plaintext for storage in Postgres (AES-256-GCM). */
export function encryptSecret(plaintext: string, secret: string): string {
  const key = encryptionKey(secret);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

/** Decrypt a value produced by `encryptSecret`. */
export function decryptSecret(ciphertextB64: string, secret: string): string {
  const key = encryptionKey(secret);
  const buf = Buffer.from(ciphertextB64, "base64");
  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final("utf8");
}
