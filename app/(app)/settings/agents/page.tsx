import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import "@/lib/ai/registry.bootstrap";
import { listAgents } from "@/lib/ai/registry";
import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { agentSettingsService } from "@/lib/services/agentSettingsService";

import {
  AgentSettingsForm,
  type AgentSettingsFormValues,
} from "./AgentSettingsForm";

export const metadata: Metadata = { title: "Agents" };
export const dynamic = "force-dynamic";

export default async function AgentsSettingsPage() {
  const actor = await requireAuth(["OWNER", "ADMIN", "ACADEMIC_MANAGER"]);
  ensure(actor, "agent.settings.read");

  const defs = listAgents().sort((a, b) => a.name.localeCompare(b.name));
  const allSettings = await agentSettingsService.listAll();
  const byName = new Map(allSettings.map((s) => [s.agentName, s]));

  return (
    <>
      <PageHeader
        title="Agents"
        description="Per-agent overrides. Universal preamble, safety, org context and knowledge are always prepended."
      />
      <div className="space-y-4 p-6">
        {defs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No agents registered yet.
          </p>
        ) : null}
        {defs.map((def) => {
          const row = byName.get(def.name) ?? null;
          const ov = agentSettingsService.toOverrides(row);
          const initial: AgentSettingsFormValues = {
            enabled: ov.enabled,
            systemPromptOverride: ov.systemPromptOverride ?? "",
            modelProvider: ov.modelProvider ?? "",
            modelName: ov.modelName ?? "",
            temperature: ov.temperature !== null ? String(ov.temperature) : "",
            confidenceThreshold:
              ov.confidenceThreshold !== null
                ? String(ov.confidenceThreshold)
                : "",
            maxRiskLevel: ov.maxRiskLevel ?? "",
            defaultAutomationLevel: ov.defaultAutomationLevel ?? "",
            costCapCents:
              ov.costCapCents !== null ? String(ov.costCapCents) : "",
            timeoutMs: ov.timeoutMs !== null ? String(ov.timeoutMs) : "",
          };
          return (
            <Card key={def.name}>
              <CardHeader className="flex flex-col items-start gap-1">
                <CardTitle className="font-mono text-sm">{def.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{def.purpose}</p>
                <p className="text-xs text-muted-foreground">
                  Workflow step:{" "}
                  <span className="font-mono">{def.workflowStep}</span> · Tools:{" "}
                  {def.allowedTools.length === 0 ? (
                    <span className="text-muted-foreground">none</span>
                  ) : (
                    def.allowedTools.map((t) => (
                      <span
                        key={t}
                        className="mr-1 rounded bg-muted px-1 py-0.5 font-mono text-[10px]"
                      >
                        {t}
                      </span>
                    ))
                  )}
                </p>
              </CardHeader>
              <CardContent>
                <AgentSettingsForm
                  agentName={def.name}
                  initial={initial}
                  initialPromptVersion={ov.promptVersion}
                  defaults={{
                    inCodeSystemPromptPreview: def.systemPrompt,
                    inCodeModelProvider: def.model.provider,
                    inCodeModelName: def.model.model,
                    inCodeConfidenceThreshold: def.confidenceThreshold,
                    inCodeMaxRiskLevel: def.maxRiskLevel,
                    inCodeDefaultAutomationLevel: def.defaultAutomationLevel,
                    inCodeCostCapCents: def.costCapCents,
                    inCodeTimeoutMs: def.timeoutMs,
                  }}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
