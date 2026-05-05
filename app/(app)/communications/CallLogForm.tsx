"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CALL_OUTCOME_VALUES,
  COMM_DIRECTION_VALUES,
  COMM_ENTITY_TYPE_VALUES,
} from "@/lib/schemas/comms";

import { logCallAction, type CommMutationResult } from "./actions";

interface Values {
  direction: (typeof COMM_DIRECTION_VALUES)[number];
  fromNumber: string;
  toNumber: string;
  outcome: string;
  durationMinutes: string;
  occurredAt: string;
  summary: string;
  transcriptUrl: string;
  recordingUrl: string;
  entityType: string;
  entityId: string;
}

const EMPTY: Values = {
  direction: "OUTBOUND",
  fromNumber: "",
  toNumber: "",
  outcome: "",
  durationMinutes: "",
  occurredAt: "",
  summary: "",
  transcriptUrl: "",
  recordingUrl: "",
  entityType: "",
  entityId: "",
};

function localToIso(s: string): string {
  if (!s) return "";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export function CallLogForm({ initial = EMPTY }: { initial?: Values }) {
  const [values, setValues] = useState<Values>(initial);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<CommMutationResult | null>(null);
  const router = useRouter();

  function set<K extends keyof Values>(k: K, v: Values[K]) {
    setValues((prev) => ({ ...prev, [k]: v }));
    setResult(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const dur = values.durationMinutes ? Number(values.durationMinutes) : NaN;
    const durationSeconds =
      Number.isFinite(dur) && dur > 0 ? Math.round(dur * 60) : undefined;

    const payload = {
      direction: values.direction,
      fromNumber: values.fromNumber.trim() || undefined,
      toNumber: values.toNumber.trim() || undefined,
      outcome: values.outcome
        ? (values.outcome as (typeof CALL_OUTCOME_VALUES)[number])
        : undefined,
      durationSeconds,
      occurredAt: localToIso(values.occurredAt) || undefined,
      summary: values.summary.trim() || undefined,
      transcriptUrl: values.transcriptUrl.trim() || undefined,
      recordingUrl: values.recordingUrl.trim() || undefined,
      entityType: values.entityType || undefined,
      entityId: values.entityId.trim() || undefined,
    };
    startTransition(async () => {
      const r = await logCallAction(payload);
      setResult(r);
      if (r.ok) router.push("/communications");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <Label>Direction *</Label>
          <Select
            value={values.direction}
            onChange={(e) =>
              set("direction", e.target.value as Values["direction"])
            }
          >
            {COMM_DIRECTION_VALUES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Outcome</Label>
          <Select
            value={values.outcome}
            onChange={(e) => set("outcome", e.target.value)}
          >
            <option value="">— Unknown —</option>
            {CALL_OUTCOME_VALUES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="occurredAt">When</Label>
          <Input
            id="occurredAt"
            type="datetime-local"
            value={values.occurredAt}
            onChange={(e) => set("occurredAt", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor="fromNumber">From #</Label>
          <Input
            id="fromNumber"
            value={values.fromNumber}
            onChange={(e) => set("fromNumber", e.target.value)}
            maxLength={40}
          />
        </div>
        <div>
          <Label htmlFor="toNumber">To #</Label>
          <Input
            id="toNumber"
            value={values.toNumber}
            onChange={(e) => set("toNumber", e.target.value)}
            maxLength={40}
          />
        </div>
        <div>
          <Label htmlFor="durationMinutes">Duration (min)</Label>
          <Input
            id="durationMinutes"
            type="number"
            min={0}
            step="0.5"
            value={values.durationMinutes}
            onChange={(e) => set("durationMinutes", e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="summary">Summary</Label>
        <Textarea
          id="summary"
          value={values.summary}
          onChange={(e) => set("summary", e.target.value)}
          rows={5}
          maxLength={8000}
          placeholder="What was discussed? Decisions, next steps."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="recordingUrl">Recording URL</Label>
          <Input
            id="recordingUrl"
            type="url"
            value={values.recordingUrl}
            onChange={(e) => set("recordingUrl", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="transcriptUrl">Transcript URL</Label>
          <Input
            id="transcriptUrl"
            type="url"
            value={values.transcriptUrl}
            onChange={(e) => set("transcriptUrl", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label>Linked entity (optional)</Label>
          <Select
            value={values.entityType}
            onChange={(e) => set("entityType", e.target.value)}
          >
            <option value="">— None —</option>
            {COMM_ENTITY_TYPE_VALUES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="entityId">Entity ID</Label>
          <Input
            id="entityId"
            value={values.entityId}
            onChange={(e) => set("entityId", e.target.value)}
            placeholder="UUID of the linked record"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Log call"}
        </Button>
        {result && !result.ok ? (
          <span className="text-xs text-destructive">{result.error}</span>
        ) : null}
      </div>
    </form>
  );
}
