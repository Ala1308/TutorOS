import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { googleTokens } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { encryptSecret } from "@/lib/google/crypto";
import { ValidationError } from "@/lib/utils/errors";

import type { Actor } from "@/lib/auth/types";
import type { Credentials } from "google-auth-library";

import { auditService } from "./auditService";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const googleTokenService = {
  async getSummary(
    userId: string,
  ): Promise<
    { connected: false } | { connected: true; scope: string; expiresAt: Date }
  > {
    const [row] = await db
      .select({
        scope: googleTokens.scope,
        expiresAt: googleTokens.expiresAt,
      })
      .from(googleTokens)
      .where(eq(googleTokens.userId, userId))
      .limit(1);
    if (!row) return { connected: false };
    return {
      connected: true,
      scope: row.scope,
      expiresAt: row.expiresAt,
    };
  },

  /**
   * Persist encrypted tokens after OAuth code exchange. Refresh token may be
   * omitted on re-auth — we keep the existing ciphertext when possible.
   */
  async upsertFromCredentials(args: {
    userId: string;
    credentials: Credentials;
    actor: Actor;
    tx?: Tx;
  }): Promise<void> {
    const key = env.TOKEN_ENCRYPTION_KEY;
    if (!key) {
      throw new ValidationError("TOKEN_ENCRYPTION_KEY is not configured");
    }

    const access = args.credentials.access_token;
    if (!access) {
      throw new ValidationError("Google returned no access_token");
    }

    const expiryMs = args.credentials.expiry_date ?? Date.now() + 3_600_000;
    const scope = args.credentials.scope ?? "";
    const tokenType = args.credentials.token_type ?? "Bearer";

    const run = async (tx: Tx) => {
      const [existing] = await tx
        .select()
        .from(googleTokens)
        .where(eq(googleTokens.userId, args.userId))
        .limit(1);

      let refreshEnc: string;
      if (args.credentials.refresh_token) {
        refreshEnc = encryptSecret(args.credentials.refresh_token, key);
      } else if (existing) {
        refreshEnc = existing.refreshTokenEncrypted;
      } else {
        throw new ValidationError(
          "Google did not return a refresh token on first link. Try revoking TutorOS access in your Google account and connect again.",
        );
      }

      const accessEnc = encryptSecret(access, key);

      await tx
        .insert(googleTokens)
        .values({
          userId: args.userId,
          accessTokenEncrypted: accessEnc,
          refreshTokenEncrypted: refreshEnc,
          scope,
          tokenType,
          expiresAt: new Date(expiryMs),
        })
        .onConflictDoUpdate({
          target: googleTokens.userId,
          set: {
            accessTokenEncrypted: accessEnc,
            refreshTokenEncrypted: refreshEnc,
            scope,
            tokenType,
            expiresAt: new Date(expiryMs),
            updatedAt: new Date(),
          },
        });

      await auditService.logAuditEvent(
        {
          actorType: args.actor.type,
          actorId: args.actor.id,
          action: "google.oauth.connected",
          entityType: "User",
          entityId: args.userId,
          metadata: {
            scope,
            expiresAt: new Date(expiryMs).toISOString(),
          },
        },
        tx,
      );
    };

    if (args.tx) await run(args.tx);
    else await db.transaction(run);
  },

  async disconnect(args: { userId: string; actor: Actor }): Promise<boolean> {
    return db.transaction(async (tx) => {
      const deleted = await tx
        .delete(googleTokens)
        .where(eq(googleTokens.userId, args.userId))
        .returning({ id: googleTokens.id });
      if (deleted.length === 0) return false;

      await auditService.logAuditEvent(
        {
          actorType: args.actor.type,
          actorId: args.actor.id,
          action: "google.oauth.disconnected",
          entityType: "User",
          entityId: args.userId,
        },
        tx,
      );
      return true;
    });
  },
};
