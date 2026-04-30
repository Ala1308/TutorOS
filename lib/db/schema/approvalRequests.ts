import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { idCol, timestamps } from "./_helpers";
import { approvalStatusEnum, riskLevelEnum } from "./enums";

/**
 * Pending human decisions. Created by tools / agents / workflows; resolved
 * via the approvalService. Resolution fires an Inngest event so workflows
 * can resume.
 */
export const approvalRequests = pgTable(
  "approval_requests",
  {
    id: idCol(),

    agentRunId: uuid("agent_run_id"),

    title: text("title").notNull(),
    description: text("description").notNull(),

    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),

    proposedAction: text("proposed_action").notNull(),
    proposedPayload: jsonb("proposed_payload").$type<unknown>(),
    currentState: jsonb("current_state").$type<unknown>(),

    riskLevel: riskLevelEnum("risk_level").notNull().default("MEDIUM"),

    status: approvalStatusEnum("status").notNull().default("PENDING"),

    reviewedById: uuid("reviewed_by_id"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewNotes: text("review_notes"),

    expiresAt: timestamp("expires_at", { withTimezone: true }),

    ...timestamps(),
  },
  (t) => ({
    statusIdx: index("approvals_status_idx").on(t.status),
    entityIdx: index("approvals_entity_idx").on(t.entityType, t.entityId),
    createdIdx: index("approvals_created_at_idx").on(t.createdAt),
    agentRunIdx: index("approvals_agent_run_idx").on(t.agentRunId),
  }),
);

export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type NewApprovalRequest = typeof approvalRequests.$inferInsert;
