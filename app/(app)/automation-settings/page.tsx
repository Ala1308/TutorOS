import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import {
  DEFAULT_AUTOMATION_MODE,
  WORKFLOW_STEPS,
  automationService,
  isHighRiskStep,
} from "@/lib/services/automationService";

import { AutomationModeSelect } from "./AutomationModeSelect";

import type { AutomationLevel } from "@/lib/ai/types";

export const metadata: Metadata = { title: "Automation settings" };
export const dynamic = "force-dynamic";

const MODES: Array<{ v: AutomationLevel; desc: string }> = [
  { v: "MANUAL", desc: "No AI involvement." },
  { v: "DRAFT_ONLY", desc: "AI produces a draft for human review." },
  { v: "AUTO_AFTER_APPROVAL", desc: "AI executes after explicit approval." },
  {
    v: "FULL_AUTO",
    desc: "AI executes without approval (low-risk steps only).",
  },
];

export default async function AutomationSettingsPage() {
  const actor = await requireAuth(["OWNER", "ADMIN"]);
  ensure(actor, "automation.read");

  const userPrefs = await automationService.getAllForUser(actor.id);

  return (
    <>
      <PageHeader
        title="Automation"
        description={`Per-step automation level. Default for unset steps is ${DEFAULT_AUTOMATION_MODE}. High-risk steps cannot be set to FULL_AUTO.`}
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

        {Object.entries(WORKFLOW_STEPS).map(([domain, steps]) => (
          <Card key={domain}>
            <CardHeader>
              <CardTitle className="capitalize">{domain}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {Object.entries(steps).map(([stepName, key]) => {
                const current = userPrefs.get(key) ?? DEFAULT_AUTOMATION_MODE;
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                  >
                    <div>
                      <div className="font-medium">{stepName}</div>
                      <div className="text-xs text-muted-foreground">{key}</div>
                    </div>
                    <AutomationModeSelect
                      workflowStep={key}
                      initialMode={current}
                      isHighRisk={isHighRiskStep(key)}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
