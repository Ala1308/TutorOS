import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { idCol, timestamps } from "./_helpers";
import { callOutcomeEnum, commDirectionEnum } from "./enums";

/**
 * Phone / voice call log. Either logged manually by an operator or persisted
 * from the voice provider adapter (mock / vapi / etc). We keep entity
 * references as a free-form (entityType, entityId) pair to mirror
 * `email_threads` and avoid coupling to specific FKs.
 */
export const callRecords = pgTable(
  "call_records",
  {
    id: idCol(),

    direction: commDirectionEnum("direction").notNull(),
    fromNumber: text("from_number"),
    toNumber: text("to_number"),

    entityType: text("entity_type"),
    entityId: text("entity_id"),

    summary: text("summary"),
    transcriptUrl: text("transcript_url"),
    recordingUrl: text("recording_url"),

    outcome: callOutcomeEnum("outcome"),

    durationSeconds: integer("duration_seconds"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /** Voice-provider call id when synced from an adapter. */
    providerCallId: text("provider_call_id"),
    provider: text("provider"),

    ...timestamps(),
  },
  (t) => ({
    entityIdx: index("call_records_entity_idx").on(t.entityType, t.entityId),
    occurredIdx: index("call_records_occurred_idx").on(t.occurredAt),
    providerIdx: index("call_records_provider_idx").on(t.providerCallId),
  }),
);

export type CallRecord = typeof callRecords.$inferSelect;
export type NewCallRecord = typeof callRecords.$inferInsert;
