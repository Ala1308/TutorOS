"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { saveOrgProfileAction, type SaveOrgProfileResult } from "./actions";

interface OrgProfileFormValues {
  companyName: string;
  about: string;
  voiceTone: string;
  brandGuidelines: string;
  businessHours: string;
  defaultCurrency: string;
  defaultTimezone: string;
}

export function OrgProfileForm({ initial }: { initial: OrgProfileFormValues }) {
  const [values, setValues] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SaveOrgProfileResult | null>(null);

  function set<K extends keyof OrgProfileFormValues>(
    k: K,
    v: OrgProfileFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [k]: v }));
    setResult(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await saveOrgProfileAction(values);
      setResult(r);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field id="companyName" label="Company name">
        <Input
          id="companyName"
          value={values.companyName}
          maxLength={200}
          onChange={(e) => set("companyName", e.target.value)}
          placeholder="e.g. Lumen Tutoring"
        />
      </Field>

      <Field
        id="about"
        label="About"
        hint="One paragraph the agents can quote when introducing the company."
      >
        <Textarea
          id="about"
          value={values.about}
          maxLength={4000}
          rows={4}
          onChange={(e) => set("about", e.target.value)}
        />
      </Field>

      <Field
        id="voiceTone"
        label="Voice and tone"
        hint="How the agents should sound — e.g. 'warm, parent-friendly, plain English, no jargon'."
      >
        <Textarea
          id="voiceTone"
          value={values.voiceTone}
          maxLength={2000}
          rows={3}
          onChange={(e) => set("voiceTone", e.target.value)}
        />
      </Field>

      <Field
        id="brandGuidelines"
        label="Brand guidelines"
        hint="Specific phrases to use or avoid, formatting rules, links to add, signoffs."
      >
        <Textarea
          id="brandGuidelines"
          value={values.brandGuidelines}
          maxLength={4000}
          rows={4}
          onChange={(e) => set("brandGuidelines", e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field
          id="businessHours"
          label="Business hours"
          hint="e.g. Mon-Fri 9-18 ET"
        >
          <Input
            id="businessHours"
            value={values.businessHours}
            maxLength={500}
            onChange={(e) => set("businessHours", e.target.value)}
          />
        </Field>
        <Field id="defaultCurrency" label="Currency">
          <Input
            id="defaultCurrency"
            value={values.defaultCurrency}
            maxLength={8}
            onChange={(e) =>
              set("defaultCurrency", e.target.value.toUpperCase())
            }
          />
        </Field>
        <Field id="defaultTimezone" label="Timezone">
          <Input
            id="defaultTimezone"
            value={values.defaultTimezone}
            maxLength={64}
            onChange={(e) => set("defaultTimezone", e.target.value)}
          />
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save"}
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

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
