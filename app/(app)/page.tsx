import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Today at a glance — drafts, approvals, and run health."
      />
      <div className="grid gap-4 p-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Approval queue</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Pending decisions surface here. Wire from{" "}
            <code>approvalService.listPending()</code>.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent agent runs</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Confidence and risk by agent, last 24h.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cost today</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Per-agent spend vs daily caps from <code>lib/ai/budget.ts</code>.
          </CardContent>
        </Card>
      </div>
    </>
  );
}
