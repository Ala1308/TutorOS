import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { idCol, timestamps } from "./_helpers";
import { agentRunStatusEnum, riskLevelEnum } from "./enums";

/**
 * One execution of an agent. Records exact agent name + version, full input,
 * full output, model usage / cost, and the Langfuse trace ID for cross-link.
 */
export const agentRuns = pgTable(
  "agent_runs",
  {
    id: idCol(),

    agentName: text("agent_name").notNull(),
    agentVersion: integer("agent_version").notNull(),
    workflowStep: text("workflow_step").notNull(),

    triggerSource: text("trigger_source").notNull(),
    parentRunId: uuid("parent_run_id"),

    actorType: text("actor_type").notNull(),
    actorId: text("actor_id").notNull(),

    entityType: text("entity_type"),
    entityId: text("entity_id"),

    status: agentRunStatusEnum("status").notNull().default("RUNNING"),

    input: jsonb("input").$type<unknown>(),
    output: jsonb("output").$type<unknown>(),

    confidence: integer("confidence_x100"),
    riskLevel: riskLevelEnum("risk_level"),
    riskFlags: jsonb("risk_flags").$type<string[]>().default([]),
    requiresApproval: integer("requires_approval_int").default(0),

    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    costCents: integer("cost_cents"),

    modelProvider: text("model_provider"),
    modelName: text("model_name"),

    langfuseTraceId: text("langfuse_trace_id"),

    error: text("error"),

    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    ...timestamps(),
  },
  (t) => ({
    agentNameIdx: index("agent_runs_agent_name_idx").on(t.agentName),
    statusIdx: index("agent_runs_status_idx").on(t.status),
    entityIdx: index("agent_runs_entity_idx").on(t.entityType, t.entityId),
    createdIdx: index("agent_runs_created_at_idx").on(t.createdAt),
  }),
);

export type AgentRun = typeof agentRuns.$inferSelect;
export type NewAgentRun = typeof agentRuns.$inferInsert;
