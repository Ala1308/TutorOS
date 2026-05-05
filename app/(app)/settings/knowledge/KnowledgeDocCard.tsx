"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  deleteKnowledgeAction,
  updateKnowledgeAction,
  type KnowledgeMutationResult,
} from "./actions";

export interface KnowledgeDocFormValues {
  title: string;
  content: string;
  tags: string;
  agentScopes: string;
  enabled: boolean;
}

export function KnowledgeDocCard({
  id,
  initial,
  agentNames,
}: {
  id: string;
  initial: KnowledgeDocFormValues;
  agentNames: string[];
}) {
  const [values, setValues] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<KnowledgeMutationResult | null>(null);

  function set<K extends keyof KnowledgeDocFormValues>(
    k: K,
    v: KnowledgeDocFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [k]: v }));
    setResult(null);
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await updateKnowledgeAction(id, {
        title: values.title,
        content: values.content,
        tags: values.tags,
        agentScopes: values.agentScopes,
        enabled: values.enabled ? "on" : "off",
      });
      setResult(r);
    });
  }

  function onDelete() {
    if (
      !confirm(
        "Delete this knowledge document? This is reversible (soft delete).",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const r = await deleteKnowledgeAction(id);
      setResult(r);
    });
  }

  return (
    <form onSubmit={onSave} className="space-y-3 rounded-md border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <Label htmlFor={`${id}-title`}>Title</Label>
          <Input
            id={`${id}-title`}
            value={values.title}
            onChange={(e) => set("title", e.target.value)}
            maxLength={200}
            required
          />
        </div>
        <label className="flex items-center gap-2 pt-6 text-sm">
          <input
            type="checkbox"
            checked={values.enabled}
            onChange={(e) => set("enabled", e.target.checked)}
          />
          Enabled
        </label>
      </div>

      <div>
        <Label htmlFor={`${id}-content`}>Content</Label>
        <Textarea
          id={`${id}-content`}
          value={values.content}
          onChange={(e) => set("content", e.target.value)}
          rows={6}
          maxLength={40_000}
          className="font-mono text-xs"
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor={`${id}-tags`}>Tags (comma-separated)</Label>
          <Input
            id={`${id}-tags`}
            value={values.tags}
            onChange={(e) => set("tags", e.target.value)}
            placeholder="pricing, refund-policy, escalation"
          />
        </div>
        <div>
          <Label htmlFor={`${id}-scopes`}>
            Agent scopes (comma-separated, * for all)
          </Label>
          <Input
            id={`${id}-scopes`}
            value={values.agentScopes}
            onChange={(e) => set("agentScopes", e.target.value)}
            placeholder="* or e.g. leadScoring, salesAgent"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Known agents:{" "}
            {agentNames.length === 0 ? "—" : agentNames.join(", ")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save"}
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={isPending}
          onClick={onDelete}
        >
          Delete
        </Button>
        {result?.ok ? (
          <span className="text-xs text-muted-foreground">Saved.</span>
        ) : null}
        {result && !result.ok ? (
          <span className="text-xs text-destructive">{result.error}</span>
        ) : null}
      </div>
    </form>
  );
}
