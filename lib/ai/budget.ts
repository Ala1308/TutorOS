import { sql, and, eq, gte } from "drizzle-orm";

import { db } from "@/lib/db";
import { agentRuns } from "@/lib/db/schema";

/**
 * LLM cost controls. Enforced inside runAgent before model calls.
 * Numbers are intentionally low — bump them in PRs explicitly.
 */
export const budget = {
  /** Global cap across all agents per calendar day, in cents. */
  globalDailyCapCents: 5_000, // $50/day MVP default

  /** Per-agent daily cap defaults to 1/5 of global. */
  perAgentDailyCapCents: 1_000, // $10/agent/day

  /** Per-user, per-agent rate limit. */
  rateLimit: {
    runsPerMinutePerAgent: 10,
  },
};

function startOfTodayUtc(): Date {
  const d = new Date();
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

export async function getTodayGlobalSpendCents(): Promise<number> {
  const since = startOfTodayUtc();
  const [row] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${agentRuns.costCents}), 0)::int`,
    })
    .from(agentRuns)
    .where(gte(agentRuns.createdAt, since));
  return row?.total ?? 0;
}

export async function getTodayAgentSpendCents(
  agentName: string,
): Promise<number> {
  const since = startOfTodayUtc();
  const [row] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${agentRuns.costCents}), 0)::int`,
    })
    .from(agentRuns)
    .where(
      and(eq(agentRuns.agentName, agentName), gte(agentRuns.createdAt, since)),
    );
  return row?.total ?? 0;
}

export async function checkBudget(agentName: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const [global, perAgent] = await Promise.all([
    getTodayGlobalSpendCents(),
    getTodayAgentSpendCents(agentName),
  ]);

  if (global >= budget.globalDailyCapCents) {
    return { allowed: false, reason: "global_daily_cap_reached" };
  }
  if (perAgent >= budget.perAgentDailyCapCents) {
    return { allowed: false, reason: "per_agent_daily_cap_reached" };
  }
  return { allowed: true };
}
