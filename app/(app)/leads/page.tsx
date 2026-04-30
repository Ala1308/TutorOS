import Link from "next/link";
import type { Metadata } from "next";

import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge, RiskBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { leadService } from "@/lib/services/leadService";
import { formatRelative } from "@/lib/utils/dates";

import type { Lead } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Leads" };
export const dynamic = "force-dynamic";

const columns: Column<Lead>[] = [
  {
    key: "parent",
    header: "Parent",
    cell: (l) => (
      <Link href={`/leads/${l.id}`} className="font-medium hover:underline">
        {l.parentName}
      </Link>
    ),
  },
  {
    key: "subject",
    header: "Subject",
    cell: (l) => (
      <div className="text-muted-foreground">
        {l.subjectNeeded} · {l.studentGrade}
      </div>
    ),
  },
  {
    key: "score",
    header: "Score",
    cell: (l) => (l.score == null ? "—" : <span>{l.score}</span>),
  },
  {
    key: "risk",
    header: "Risk",
    cell: (l) => (l.riskLevel ? <RiskBadge level={l.riskLevel} /> : "—"),
  },
  {
    key: "status",
    header: "Status",
    cell: (l) => <StatusBadge status={l.status} />,
  },
  {
    key: "created",
    header: "Created",
    cell: (l) => (
      <span className="text-muted-foreground">
        {formatRelative(l.createdAt)}
      </span>
    ),
  },
];

export default async function LeadsPage() {
  const rows = await leadService.list({ limit: 50 });
  return (
    <>
      <PageHeader
        title="Leads"
        description="Inbound parent inquiries — triaged and scored."
        actions={
          <Link href="/leads/new">
            <Button size="sm">New lead</Button>
          </Link>
        }
      />
      <div className="p-6">
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(l) => l.id}
          emptyTitle="No leads yet"
          emptyDescription="Create a lead manually or wire your intake form to /api/public/lead-intake."
        />
      </div>
    </>
  );
}
