"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import {
  saveAgentSettingsAction,
  type SaveAgentSettingsResult,
} from "./actions";

import type { AutomationLevel, LLMProvider, RiskLevel } from "@/lib/ai/types";

const PROVIDERS: readonly LLMProvider[] = [
  "anthropic",
  "openai",
  "google",
] as const;
const RISKS: readonly RiskLevel[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;
const AUTO: readonly AutomationLevel[] = [
  "MANUAL",
  "DRAFT_ONLY",
  "AUTO_AFTER_APPROVAL",
  "FULL_AUTO",
] as const;

export interface AgentSettingsFormValues {
  enabled: boolean;
  systemPromptOverride: string;
  modelProvider: LLMProvider | "";
  modelName: string;
  temperature: string;
  confidenceThreshold: string;
  maxRiskLevel: RiskLevel | "";
  defaultAutomationLevel: AutomationLevel | "";
  costCapCents: string;
  timeoutMs: string;
}

interface Props {
  agentName: string;
  defaults: {
    inCodeSystemPromptPreview: string;
    inCodeModelProvider: LLMProvider;
    inCodeModelName: string;
    inCodeConfidenceThreshold: number;
    inCodeMaxRiskLevel: RiskLevel;
    inCodeDefaultAutomationLevel: AutomationLevel;
    inCodeCostCapCents: number;
    inCodeTimeoutMs: number;
  };
  initial: AgentSettingsFormValues;
  initialPromptVersion: number;
}

export function AgentSettingsForm({
  agentName,
  defaults,
  initial,
  initialPromptVersion,
}: Props) {
  const [values, setValues] = useState<AgentSettingsFormValues>(initial);
  const [promptVersion, setPromptVersion] = useState(initialPromptVersion);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SaveAgentSettingsResult | null>(null);
  const [showDefault, setShowDefault] = useState(false);

  function set<K extends keyof AgentSettingsFormValues>(
    k: K,
    v: AgentSettingsFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [k]: v }));
    setResult(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      enabled: values.enabled,
      systemPromptOverride: values.systemPromptOverride.trim() || null,
      modelProvider: values.modelProvider || null,
      modelName: values.modelName.trim() || null,
      temperatureBp: numOrNull(values.temperature, (n) => Math.round(n * 100)),
      confidenceThresholdBp: numOrNull(values.confidenceThreshold, (n) =>
        Math.round(n * 100),
      ),
      maxRiskLevel: values.maxRiskLevel || null,
      defaultAutomationLevel: values.defaultAutomationLevel || null,
      costCapCents: numOrNull(values.costCapCents, (n) => Math.round(n)),
      timeoutMs: numOrNull(values.timeoutMs, (n) => Math.round(n)),
    };
    startTransition(async () => {
      const r = await saveAgentSettingsAction(agentName, payload);
      setResult(r);
      if (r.ok) setPromptVersion(r.promptVersion);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.enabled}
            onChange={(e) => set("enabled", e.target.checked)}
          />
          <span>Enabled</span>
        </label>
        <div className="text-xs text-muted-foreground">
          Prompt version: <span className="font-mono">{promptVersion}</span>
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <Label htmlFor={`${agentName}-prompt`}>System prompt override</Label>
          <button
            type="button"
            onClick={() => setShowDefault((v) => !v)}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            {showDefault ? "Hide" : "Show"} in-code default
          </button>
        </div>
        <Textarea
          id={`${agentName}-prompt`}
          value={values.systemPromptOverride}
          onChange={(e) => set("systemPromptOverride", e.target.value)}
          rows={12}
          maxLength={40_000}
          placeholder="Leave blank to use the in-code prompt unchanged. Universal preamble + safety + org context + knowledge are always prepended automatically."
          className="font-mono text-xs"
        />
        {showDefault ? (
          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/50 p-3 text-xs">
            {defaults.inCodeSystemPromptPreview}
          </pre>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label>Model provider</Label>
          <Select
            value={values.modelProvider}
            onChange={(e) =>
              set("modelProvider", e.target.value as LLMProvider | "")
            }
          >
            <option value="">Default ({defaults.inCodeModelProvider})</option>
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`${agentName}-model`}>Model name</Label>
          <Input
            id={`${agentName}-model`}
            value={values.modelName}
            onChange={(e) => set("modelName", e.target.value)}
            placeholder={defaults.inCodeModelName}
          />
        </div>
        <div>
          <Label htmlFor={`${agentName}-temp`}>Temperature</Label>
          <Input
            id={`${agentName}-temp`}
            type="number"
            min={0}
            max={2}
            step={0.05}
            value={values.temperature}
            onChange={(e) => set("temperature", e.target.value)}
            placeholder="provider default"
          />
        </div>
        <div>
          <Label htmlFor={`${agentName}-conf`}>Confidence threshold</Label>
          <Input
            id={`${agentName}-conf`}
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={values.confidenceThreshold}
            onChange={(e) => set("confidenceThreshold", e.target.value)}
            placeholder={String(defaults.inCodeConfidenceThreshold)}
          />
        </div>
        <div>
          <Label>Max risk level</Label>
          <Select
            value={values.maxRiskLevel}
            onChange={(e) =>
              set("maxRiskLevel", e.target.value as RiskLevel | "")
            }
          >
            <option value="">Default ({defaults.inCodeMaxRiskLevel})</option>
            {RISKS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Default automation level</Label>
          <Select
            value={values.defaultAutomationLevel}
            onChange={(e) =>
              set(
                "defaultAutomationLevel",
                e.target.value as AutomationLevel | "",
              )
            }
          >
            <option value="">
              Default ({defaults.inCodeDefaultAutomationLevel})
            </option>
            {AUTO.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`${agentName}-cap`}>Cost cap (cents/run)</Label>
          <Input
            id={`${agentName}-cap`}
            type="number"
            min={0}
            value={values.costCapCents}
            onChange={(e) => set("costCapCents", e.target.value)}
            placeholder={String(defaults.inCodeCostCapCents)}
          />
        </div>
        <div>
          <Label htmlFor={`${agentName}-timeout`}>Timeout (ms)</Label>
          <Input
            id={`${agentName}-timeout`}
            type="number"
            min={1000}
            max={600000}
            value={values.timeoutMs}
            onChange={(e) => set("timeoutMs", e.target.value)}
            placeholder={String(defaults.inCodeTimeoutMs)}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save"}
        </Button>
        {result?.ok ? (
          <span className="text-xs text-muted-foreground">
            Saved. Prompt version {result.promptVersion}.
          </span>
        ) : null}
        {result && !result.ok ? (
          <span className="text-xs text-destructive">{result.error}</span>
        ) : null}
      </div>
    </form>
  );
}

function numOrNull(s: string, transform: (n: number) => number): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return transform(n);
}
