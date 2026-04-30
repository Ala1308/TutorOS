import { index, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { idCol, timestamps } from "./_helpers";
import { actorTypeEnum } from "./enums";

/**
 * Append-only audit log. Every mutation, agent run, approval decision,
 * automation change, and external action writes here. Never updated, never
 * deleted. The mutation and the audit row should be in the same transaction
 * when possible (auditService.logAuditEvent supports passing a tx).
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: idCol(),

    actorType: actorTypeEnum("actor_type").notNull(),
    actorId: text("actor_id").notNull(),

    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),

    metadata: jsonb("metadata").$type<unknown>(),

    agentRunId: uuid("agent_run_id"),

    ...timestamps(),
  },
  (t) => ({
    entityIdx: index("audit_entity_idx").on(t.entityType, t.entityId),
    createdIdx: index("audit_created_at_idx").on(t.createdAt),
    actorIdx: index("audit_actor_idx").on(t.actorType, t.actorId),
    actionIdx: index("audit_action_idx").on(t.action),
  }),
);

export type AuditLogRow = typeof auditLog.$inferSelect;
export type NewAuditLogRow = typeof auditLog.$inferInsert;
