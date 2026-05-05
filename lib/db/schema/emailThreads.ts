import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { idCol, timestamps } from "./_helpers";
import { commDirectionEnum } from "./enums";

/**
 * Every Gmail thread / manually-logged email we know about. Bulk sends are
 * forbidden — one thread per outbound message context.
 */
export const emailThreads = pgTable(
  "email_threads",
  {
    id: idCol(),
    gmailThreadId: text("gmail_thread_id"),
    subject: text("subject").notNull(),
    fromEmail: text("from_email").notNull(),
    toEmails: jsonb("to_emails").$type<string[]>().notNull(),
    ccEmails: jsonb("cc_emails").$type<string[]>().default([]),
    bccEmails: jsonb("bcc_emails").$type<string[]>().default([]),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    direction: commDirectionEnum("direction").notNull().default("OUTBOUND"),
    bodyPreview: text("body_preview"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => ({
    entityIdx: index("email_threads_entity_idx").on(t.entityType, t.entityId),
    gmailIdx: index("email_threads_gmail_idx").on(t.gmailThreadId),
    directionIdx: index("email_threads_direction_idx").on(t.direction),
  }),
);

export type EmailThread = typeof emailThreads.$inferSelect;
export type NewEmailThread = typeof emailThreads.$inferInsert;
