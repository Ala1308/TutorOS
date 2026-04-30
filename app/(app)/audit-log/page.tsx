import type { Metadata } from "next";

import { DataTable, type Column } from "@/components/common/DataTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { auditService } from "@/lib/services/auditService";
import { formatDateTime } from "@/lib/utils/dates";

import type { AuditLogRow } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Audit log" };
export const dynamic = "force-dynamic";

const columns: Column<AuditLogRow>[] = [
  {
    key: "when",
    header: "When",
    cell: (r) => (
      <span className="font-mono text-xs text-muted-foreground">
        {formatDateTime(r.createdAt)}
      </span>
    ),
  },
  {
    key: "actor",
    header: "Actor",
    cell: (r) => (
      <span>
        {r.actorType}:{r.actorId.slice(0, 12)}
      </span>
    ),
  },
  { key: "action", header: "Action", cell: (r) => <span>{r.action}</span> },
  {
    key: "entity",
    header: "Entity",
    cell: (r) => (
      <span className="text-muted-foreground">
        {r.entityType} #{r.entityId.slice(0, 8)}
      </span>
    ),
  },
];

export default async function AuditLogPage() {
  const rows = await auditService.listRecent(200);
  return (
    <>
      <PageHeader
        title="Audit log"
        description="Append-only record of every mutation, agent run, approval, and external action."
      />
      <div className="p-6">
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          emptyTitle="Audit log is empty"
        />
      </div>
    </>
  );
}
