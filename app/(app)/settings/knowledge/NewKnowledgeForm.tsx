"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { createKnowledgeAction, type KnowledgeMutationResult } from "./actions";

const EMPTY = {
  title: "",
  content: "",
  tags: "",
  agentScopes: "*",
  enabled: true,
};

export function NewKnowledgeForm({ agentNames }: { agentNames: string[] }) {
  const [values, setValues] = useState(EMPTY);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<KnowledgeMutationResult | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await createKnowledgeAction({
        title: values.title,
        content: values.content,
        tags: values.tags,
        agentScopes: values.agentScopes,
        enabled: values.enabled ? "on" : "off",
      });
      setResult(r);
      if (r.ok) setValues(EMPTY);
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-md border bg-card p-4"
    >
      <div>
        <Label htmlFor="new-title">Title</Label>
        <Input
          id="new-title"
          value={values.title}
          onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
          maxLength={200}
          required
        />
      </div>
      <div>
        <Label htmlFor="new-content">Content</Label>
        <Textarea
          id="new-content"
          value={values.content}
          onChange={(e) =>
            setValues((v) => ({ ...v, content: e.target.value }))
          }
          rows={5}
          maxLength={40_000}
          className="font-mono text-xs"
          required
        />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="new-tags">Tags</Label>
          <Input
            id="new-tags"
            value={values.tags}
            onChange={(e) => setValues((v) => ({ ...v, tags: e.target.value }))}
            placeholder="pricing, refund-policy"
          />
        </div>
        <div>
          <Label htmlFor="new-scopes">Agent scopes</Label>
          <Input
            id="new-scopes"
            value={values.agentScopes}
            onChange={(e) =>
              setValues((v) => ({ ...v, agentScopes: e.target.value }))
            }
            placeholder="* or e.g. leadScoring"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Known agents:{" "}
            {agentNames.length === 0 ? "—" : agentNames.join(", ")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating..." : "Add document"}
        </Button>
        {result && !result.ok ? (
          <span className="text-xs text-destructive">{result.error}</span>
        ) : null}
      </div>
    </form>
  );
}
