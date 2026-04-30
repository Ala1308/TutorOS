import type { Metadata } from "next";
import { desc } from "drizzle-orm";

import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { db } from "@/lib/db";
import { agentRuns, type AgentRun } from "@/lib/db/schema";
import { formatRelative } from "@/lib/utils/dates";
import { formatMoney } from "@/lib/utils/money";

export const metadata: Metadata = { title: "Agent runs" };
export const dynamic = "force-dynamic";

const columns: Column<AgentRun>[] = [
  {
    key: "agent",
    header: "Agent",
    cell: (r) => (
      <span className="font-medium">
        {r.agentName}{" "}
        <span className="text-muted-foreground">v{r.agentVersion}</span>
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (r) => <StatusBadge status={r.status} />,
  },
  {
    key: "conf",
    header: "Conf",
    cell: (r) =>
      r.confidence == null ? (
        "—"
      ) : (
        <span>{(r.confidence / 100).toFixed(2)}</span>
      ),
  },
  {
    key: "risk",
    header: "Risk",
    cell: (r) => (r.riskLevel ? <StatusBadge status={r.riskLevel} /> : "—"),
  },
  {
    key: "cost",
    header: "Cost",
    cell: (r) =>
      r.costCents == null ? "—" : formatMoney(r.costCents, "USD", "en-US"),
  },
  {
    key: "entity",
    header: "Entity",
    cell: (r) =>
      r.entityType ? (
        <span className="text-muted-foreground">
          {r.entityType} #{r.entityId?.slice(0, 8)}
        </span>
      ) : (
        "—"
      ),
  },
  {
    key: "created",
    header: "Started",
    cell: (r) => (
      <span className="text-muted-foreground">
        {formatRelative(r.startedAt)}
      </span>
    ),
  },
];

export default async function AgentRunsPage() {
  const rows = await db
    .select()
    .from(agentRuns)
    .orderBy(desc(agentRuns.startedAt))
    .limit(100);
  return (
    <>
      <PageHeader
        title="Agent runs"
        description="Last 100 agent executions with cost, confidence, and risk."
      />
      <div className="p-6">
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          emptyTitle="No agent runs yet"
        />
      </div>
    </>
  );
}
