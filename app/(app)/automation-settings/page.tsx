import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { WORKFLOW_STEPS } from "@/lib/services/automationService";

export const metadata: Metadata = { title: "Automation settings" };

const MODES = [
  { v: "MANUAL", desc: "No AI involvement." },
  { v: "DRAFT_ONLY", desc: "AI produces a draft for human review." },
  { v: "AUTO_AFTER_APPROVAL", desc: "AI executes after explicit approval." },
  { v: "FULL_AUTO", desc: "AI executes without approval (low-risk only)." },
] as const;

export default function AutomationSettingsPage() {
  const groups = Object.entries(WORKFLOW_STEPS);
  return (
    <>
      <PageHeader
        title="Automation"
        description="Per-step automation level. Default for any new step is DRAFT_ONLY."
      />
      <div className="grid gap-4 p-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Modes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {MODES.map((m) => (
              <div key={m.v} className="flex items-baseline gap-3">
                <span className="font-mono text-xs">{m.v}</span>
                <span className="text-muted-foreground">{m.desc}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {groups.map(([domain, steps]) => (
          <Card key={domain}>
            <CardHeader>
              <CardTitle className="capitalize">{domain}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {Object.entries(steps).map(([step, key]) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                >
                  <div>
                    <div className="font-medium">{step}</div>
                    <div className="text-xs text-muted-foreground">{key}</div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    DRAFT_ONLY
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
