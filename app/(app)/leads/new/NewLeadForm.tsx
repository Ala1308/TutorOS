"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createLeadAction } from "../actions";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const SOURCES = [
  "WEBSITE",
  "REFERRAL",
  "SOCIAL",
  "PARTNER",
  "ADS",
  "OTHER",
] as const;

export function NewLeadForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    const input = {
      parentName: String(formData.get("parentName") ?? ""),
      parentEmail: String(formData.get("parentEmail") ?? ""),
      parentPhone: String(formData.get("parentPhone") ?? "") || undefined,
      studentGrade: String(formData.get("studentGrade") ?? ""),
      subjectNeeded: String(formData.get("subjectNeeded") ?? ""),
      message: String(formData.get("message") ?? "") || undefined,
      source: String(
        formData.get("source") ?? "WEBSITE",
      ) as (typeof SOURCES)[number],
      consentDataProcessing: formData.get("consentDataProcessing") === "on",
    };

    startTransition(async () => {
      try {
        const res = await createLeadAction(input);
        router.push(`/leads/${res.id}`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create lead");
      }
    });
  }

  return (
    <Card className="max-w-2xl">
      <CardContent className="p-6">
        <form action={onSubmit} className="grid gap-4">
          <Field id="parentName" label="Parent name" required />
          <Field id="parentEmail" label="Parent email" type="email" required />
          <Field id="parentPhone" label="Parent phone" type="tel" />
          <div className="grid grid-cols-2 gap-3">
            <Field id="studentGrade" label="Student grade" required />
            <Field id="subjectNeeded" label="Subject needed" required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="source">Source</Label>
            <Select id="source" name="source" defaultValue="WEBSITE">
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" name="message" rows={4} />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="consentDataProcessing"
              className="mt-0.5"
              required
            />
            <span>
              Parent has consented to data processing (Quebec Law 25
              requirement).
            </span>
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create lead"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  id,
  label,
  type = "text",
  required,
}: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      <Input id={id} name={id} type={type} required={required} />
    </div>
  );
}
