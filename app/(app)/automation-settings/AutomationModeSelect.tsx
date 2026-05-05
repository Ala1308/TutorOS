"use client";

import { useState, useTransition } from "react";

import { Select } from "@/components/ui/select";

import {
  setAutomationModeAction,
  type SetAutomationModeResult,
} from "./actions";

import type { AutomationLevel } from "@/lib/ai/types";

const ALL_MODES = [
  "MANUAL",
  "DRAFT_ONLY",
  "AUTO_AFTER_APPROVAL",
  "FULL_AUTO",
] as const satisfies ReadonlyArray<AutomationLevel>;

const MODE_LABEL: Record<AutomationLevel, string> = {
  MANUAL: "Manual",
  DRAFT_ONLY: "Draft only",
  AUTO_AFTER_APPROVAL: "Auto after approval",
  FULL_AUTO: "Full auto",
};

interface Props {
  workflowStep: string;
  initialMode: AutomationLevel;
  isHighRisk: boolean;
}

/**
 * Client-side dropdown that pessimistically reverts on failure and shows a
 * tiny inline status. We deliberately do NOT optimistically update — for a
 * settings page, "saved" / "rejected" feedback is more important than zero
 * apparent latency.
 */
export function AutomationModeSelect({
  workflowStep,
  initialMode,
  isHighRisk,
}: Props) {
  const [mode, setMode] = useState<AutomationLevel>(initialMode);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SetAutomationModeResult | null>(null);

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as AutomationLevel;
    const previous = mode;
    setMode(next);
    setResult(null);
    startTransition(async () => {
      const r = await setAutomationModeAction({ workflowStep, mode: next });
      setResult(r);
      if (!r.ok) setMode(previous);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Select
        value={mode}
        onChange={onChange}
        disabled={isPending}
        className="h-8 w-44 text-xs"
        aria-label={`Automation mode for ${workflowStep}`}
      >
        {ALL_MODES.map((m) => {
          const disabled = m === "FULL_AUTO" && isHighRisk;
          return (
            <option key={m} value={m} disabled={disabled}>
              {MODE_LABEL[m]}
              {disabled ? " (high-risk)" : ""}
            </option>
          );
        })}
      </Select>
      {result && !result.ok ? (
        <p className="text-xs text-destructive">{result.error}</p>
      ) : null}
    </div>
  );
}
