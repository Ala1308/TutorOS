import { eq, desc, and } from "drizzle-orm";

import { db } from "@/lib/db";
import { auditLog, type NewAuditLogRow } from "@/lib/db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface LogEventInput {
  actorType: "USER" | "AGENT" | "SYSTEM";
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: unknown;
  agentRunId?: string;
}

/**
 * Append-only audit logging. The mutation and the audit row should be in the
 * same transaction whenever possible — pass the `tx` from a `db.transaction`
 * block as the second argument.
 *
 * If audit logging fails the caller's mutation must fail too.
 */
export const auditService = {
  async logAuditEvent(input: LogEventInput, tx?: Tx): Promise<void> {
    const row: NewAuditLogRow = {
      actorType: input.actorType,
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata ?? {},
      ...(input.agentRunId ? { agentRunId: input.agentRunId } : {}),
    };
    const exec = tx ?? db;
    await exec.insert(auditLog).values(row);
  },

  /** Convenience query: recent events for a given entity. */
  async listForEntity(entityType: string, entityId: string, limit = 50) {
    return db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.entityType, entityType),
          eq(auditLog.entityId, entityId),
        ),
      )
      .orderBy(desc(auditLog.createdAt))
      .limit(limit);
  },

  async listRecent(limit = 100) {
    return db
      .select()
      .from(auditLog)
      .orderBy(desc(auditLog.createdAt))
      .limit(limit);
  },
};

/**
 * Helper for the common pattern: open a transaction, run a mutation, write
 * an audit row in the same tx. Returns whatever the inner function returns.
 */
export async function withAudit<T>(
  event: LogEventInput,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    const result = await fn(tx);
    await auditService.logAuditEvent(event, tx);
    return result;
  });
}
