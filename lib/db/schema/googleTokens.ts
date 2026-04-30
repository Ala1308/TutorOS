import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { idCol, timestamps } from "./_helpers";
import { users } from "./users";

/**
 * Per-user encrypted Google OAuth tokens. Tokens are encrypted at rest with
 * TOKEN_ENCRYPTION_KEY before being written here. Never log token contents.
 */
export const googleTokens = pgTable(
  "google_tokens",
  {
    id: idCol(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessTokenEncrypted: text("access_token_encrypted").notNull(),
    refreshTokenEncrypted: text("refresh_token_encrypted").notNull(),
    scope: text("scope").notNull(),
    tokenType: text("token_type").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps(),
  },
  (t) => ({
    userIdx: uniqueIndex("google_tokens_user_idx").on(t.userId),
  }),
);

export type GoogleTokenRow = typeof googleTokens.$inferSelect;
export type NewGoogleTokenRow = typeof googleTokens.$inferInsert;
