import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { idCol, softDelete, timestamps } from "./_helpers";
import { leadSourceEnum, leadStatusEnum, riskLevelEnum } from "./enums";

/**
 * Inbound interest from a prospective parent. Lifecycle:
 *   NEW → CONTACTED → QUALIFIED → CONVERTED (creates parent + student)
 *                              ↘ DISQUALIFIED / ARCHIVED
 *
 * `score` and `riskLevel` are populated by the leadScoring agent
 * (see lib/ai/agents/leadScoring.ts).
 */
export const leads = pgTable(
  "leads",
  {
    id: idCol(),

    parentName: text("parent_name").notNull(),
    parentEmail: text("parent_email").notNull(),
    parentPhone: text("parent_phone"),

    studentGrade: text("student_grade").notNull(),
    subjectNeeded: text("subject_needed").notNull(),
    message: text("message"),

    source: leadSourceEnum("source").notNull().default("WEBSITE"),
    sourceMeta: jsonb("source_meta")
      .$type<Record<string, unknown>>()
      .default({}),

    status: leadStatusEnum("status").notNull().default("NEW"),

    score: integer("score"),
    riskLevel: riskLevelEnum("risk_level"),
    riskFlags: jsonb("risk_flags").$type<string[]>().default([]),
    scoringReasoning: text("scoring_reasoning"),

    convertedAt: timestamp("converted_at", { withTimezone: true }),
    convertedToParentId: uuid("converted_to_parent_id"),

    consentDataProcessing: boolean("consent_data_processing")
      .notNull()
      .default(false),

    ...timestamps(),
    ...softDelete(),
  },
  (t) => ({
    statusIdx: index("leads_status_idx").on(t.status),
    emailIdx: index("leads_email_idx").on(t.parentEmail),
    createdIdx: index("leads_created_at_idx").on(t.createdAt),
    sourceIdx: index("leads_source_idx").on(t.source),
  }),
);

export const leadsRelations = relations(leads, () => ({}));

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
