import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/PageHeader";
import { JsonViewer } from "@/components/common/JsonViewer";
import { RiskBadge, StatusBadge } from "@/components/common/StatusBadge";
import { ApprovalCard } from "@/components/agents/ApprovalCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { approvalService } from "@/lib/services/approvalService";
import { auditService } from "@/lib/services/auditService";
import { leadService } from "@/lib/services/leadService";
import { formatDateTime } from "@/lib/utils/dates";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const lead = await leadService.get(id);
  return { title: lead ? `Lead - ${lead.parentName}` : "Lead" };
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await leadService.get(id);
  if (!lead) notFound();

  const [approvals, audit] = await Promise.all([
    approvalService.listForEntity("Lead", lead.id),
    auditService.listForEntity("Lead", lead.id, 25),
  ]);

  return (
    <>
      <PageHeader
        title={lead.parentName}
        description={`${lead.subjectNeeded} · ${lead.studentGrade} · ${lead.source}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={lead.status} />
            {lead.riskLevel ? <RiskBadge level={lead.riskLevel} /> : null}
          </div>
        }
      />
      <div className="grid gap-6 p-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <Row label="Email" value={lead.parentEmail} />
              <Row label="Phone" value={lead.parentPhone ?? "—"} />
              <Row label="Source" value={lead.source} />
              <Row label="Created" value={formatDateTime(lead.createdAt)} />
              {lead.message ? (
                <>
                  <Separator className="my-2" />
                  <p className="text-muted-foreground">{lead.message}</p>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Triage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row
                label="Score"
                value={
                  lead.score == null ? "Not scored yet" : String(lead.score)
                }
              />
              <Row
                label="Risk flags"
                value={
                  lead.riskFlags && lead.riskFlags.length > 0
                    ? lead.riskFlags.join(", ")
                    : "—"
                }
              />
              {lead.scoringReasoning ? (
                <p className="text-muted-foreground">{lead.scoringReasoning}</p>
              ) : null}
            </CardContent>
          </Card>

          {approvals.length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Approvals
              </h2>
              {approvals.map((a) => (
                <ApprovalCard key={a.id} approval={a} />
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {audit.length === 0 ? (
                <p className="text-muted-foreground">No activity yet.</p>
              ) : (
                audit.map((a) => (
                  <div key={a.id} className="flex items-start gap-2">
                    <span className="font-mono text-muted-foreground">
                      {formatDateTime(a.createdAt, "HH:mm")}
                    </span>
                    <span>{a.action}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Raw record</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonViewer value={lead} maxHeight={400} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
