"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  createParentAction,
  updateParentAction,
  type ParentMutationResult,
} from "./actions";

export interface ParentFormValues {
  fullName: string;
  email: string;
  phone: string;
  timezone: string;
  notes: string;
}

const EMPTY: ParentFormValues = {
  fullName: "",
  email: "",
  phone: "",
  timezone: "",
  notes: "",
};

export function ParentForm({
  mode,
  parentId,
  initial = EMPTY,
}: {
  mode: "create" | "edit";
  parentId?: string;
  initial?: ParentFormValues;
}) {
  const [values, setValues] = useState<ParentFormValues>(initial);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ParentMutationResult | null>(null);
  const router = useRouter();

  function set<K extends keyof ParentFormValues>(k: K, v: ParentFormValues[K]) {
    setValues((prev) => ({ ...prev, [k]: v }));
    setResult(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      phone: values.phone.trim() || undefined,
      timezone: values.timezone.trim() || undefined,
      notes: values.notes.trim() || undefined,
    };
    startTransition(async () => {
      const r =
        mode === "create"
          ? await createParentAction(payload)
          : await updateParentAction(parentId, payload);
      setResult(r);
      if (r.ok && mode === "create" && r.id) {
        router.push(`/parents/${r.id}`);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="fullName">Full name *</Label>
          <Input
            id="fullName"
            value={values.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            maxLength={200}
            required
          />
        </div>
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            maxLength={200}
            required
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={values.phone}
            onChange={(e) => set("phone", e.target.value)}
            maxLength={40}
          />
        </div>
        <div>
          <Label htmlFor="timezone">Timezone</Label>
          <Input
            id="timezone"
            value={values.timezone}
            onChange={(e) => set("timezone", e.target.value)}
            placeholder="America/Montreal"
            maxLength={64}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={4}
          maxLength={4000}
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Saving..."
            : mode === "create"
              ? "Create parent"
              : "Save changes"}
        </Button>
        {result?.ok && mode === "edit" ? (
          <span className="text-xs text-muted-foreground">Saved.</span>
        ) : null}
        {result && !result.ok ? (
          <span className="text-xs text-destructive">{result.error}</span>
        ) : null}
      </div>
    </form>
  );
}
