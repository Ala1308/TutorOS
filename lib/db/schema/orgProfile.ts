import { pgTable, text } from "drizzle-orm/pg-core";

import { timestamps } from "./_helpers";

/**
 * Singleton row describing the operating company. Single-tenant for MVP —
 * the row's primary key is the literal string `default`.
 *
 * Injected as `<org_context>...</org_context>` into every agent system prompt
 * by `lib/ai/promptComposer.ts`.
 */
export const orgProfile = pgTable("org_profile", {
  id: text("id").primaryKey().notNull().default("default"),
  companyName: text("company_name").notNull().default(""),
  about: text("about").notNull().default(""),
  voiceTone: text("voice_tone").notNull().default(""),
  brandGuidelines: text("brand_guidelines").notNull().default(""),
  businessHours: text("business_hours").notNull().default(""),
  defaultCurrency: text("default_currency").notNull().default("CAD"),
  defaultTimezone: text("default_timezone")
    .notNull()
    .default("America/Montreal"),
  ...timestamps(),
});

export type OrgProfile = typeof orgProfile.$inferSelect;
export type NewOrgProfile = typeof orgProfile.$inferInsert;
