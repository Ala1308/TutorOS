import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { idCol, timestamps } from "./_helpers";
import { consentTypeEnum } from "./enums";

/**
 * Versioned, revocable consent records (Quebec Law 25 compliance).
 *
 * `subjectType` + `subjectId` is generic so the same table covers parents,
 * students, leads, and tutors without a per-entity table.
 */
export const consents = pgTable(
  "consents",
  {
    id: idCol(),

    subjectType: text("subject_type").notNull(),
    subjectId: text("subject_id").notNull(),

    consentType: consentTypeEnum("consent_type").notNull(),
    version: integer("version").notNull().default(1),

    grantedAt: timestamp("granted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),

    grantedByActorType: text("granted_by_actor_type"),
    grantedByActorId: text("granted_by_actor_id"),

    notes: text("notes"),

    ...timestamps(),
  },
  (t) => ({
    subjectIdx: index("consents_subject_idx").on(t.subjectType, t.subjectId),
    typeIdx: index("consents_type_idx").on(t.consentType),
  }),
);

export type Consent = typeof consents.$inferSelect;
export type NewConsent = typeof consents.$inferInsert;
