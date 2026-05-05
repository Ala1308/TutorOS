import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { agentRuns, type AgentRun } from "@/lib/db/schema";

/**
 * Read-side service for agent runs.
 *
 * Lifecycle (insert RUNNING / update COMPLETED|FAILED|AWAITING_APPROVAL) lives
 * inside `runAgent` itself, where the AI SDK call happens. This service is for
 * queries: detail pages, dashboards, and downstream services that need to know
 * "what's the latest run for this entity?".
 */
export const agentRunService = {
  async byId(id: string): Promise<AgentRun | null> {
    const [row] = await db
      .select()
      .from(agentRuns)
      .where(eq(agentRuns.id, id))
      .limit(1);
    return row ?? null;
  },

  async latestForEntity(
    entityType: string,
    entityId: string,
    agentName?: string,
  ): Promise<AgentRun | null> {
    const conditions = [
      eq(agentRuns.entityType, entityType),
      eq(agentRuns.entityId, entityId),
    ];
    if (agentName) conditions.push(eq(agentRuns.agentName, agentName));

    const [row] = await db
      .select()
      .from(agentRuns)
      .where(and(...conditions))
      .orderBy(desc(agentRuns.startedAt))
      .limit(1);
    return row ?? null;
  },

  async listForEntity(
    entityType: string,
    entityId: string,
    limit = 25,
  ): Promise<AgentRun[]> {
    return db
      .select()
      .from(agentRuns)
      .where(
        and(
          eq(agentRuns.entityType, entityType),
          eq(agentRuns.entityId, entityId),
        ),
      )
      .orderBy(desc(agentRuns.startedAt))
      .limit(limit);
  },

  async listRecent(limit = 100): Promise<AgentRun[]> {
    return db
      .select()
      .from(agentRuns)
      .orderBy(desc(agentRuns.startedAt))
      .limit(limit);
  },
};
