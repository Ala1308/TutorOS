import {
  boolean,
  integer,
  pgTable,
  smallint,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { idCol, timestamps } from "./_helpers";
import { riskLevelEnum, automationModeEnum } from "./enums";

/**
 * Per-agent operator overrides. One row per registered agent name (created on
 * first edit; missing → use the in-code defaults from `defineAgent`).
 *
 * `promptVersion` increments every time the operator edits `systemPromptOverride`
 * or `model*` — mirrored into `AgentRun.agentVersion` so audit/eval can compare.
 */
export const agentSettings = pgTable(
  "agent_settings",
  {
    id: idCol(),
    agentName: text("agent_name").notNull(),
    enabled: boolean("enabled").notNull().default(true),

    systemPromptOverride: text("system_prompt_override"),
    modelProvider: text("model_provider"),
    modelName: text("model_name"),
    /** 0..200, divided by 100 at use time. NULL → use SDK default. */
    temperatureBp: smallint("temperature_bp"),

    /** 0..100; divided by 100. NULL → use code default. */
    confidenceThresholdBp: smallint("confidence_threshold_bp"),
    maxRiskLevel: riskLevelEnum("max_risk_level"),
    defaultAutomationLevel: automationModeEnum("default_automation_level"),
    costCapCents: integer("cost_cap_cents"),
    timeoutMs: integer("timeout_ms"),

    promptVersion: integer("prompt_version").notNull().default(1),

    ...timestamps(),
  },
  (t) => ({
    agentNameIdx: uniqueIndex("agent_settings_name_idx").on(t.agentName),
  }),
);

export type AgentSettings = typeof agentSettings.$inferSelect;
export type NewAgentSettings = typeof agentSettings.$inferInsert;
