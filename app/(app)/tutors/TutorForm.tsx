"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TUTOR_STATUS_VALUES, splitCsv } from "@/lib/schemas/people";

import {
  createTutorAction,
  updateTutorAction,
  type TutorMutationResult,
} from "./actions";

export interface TutorFormValues {
  fullName: string;
  email: string;
  phone: string;
  status: (typeof TUTOR_STATUS_VALUES)[number];
  subjects: string;
  grades: string;
  hourlyRateCents: string;
  notes: string;
}

const EMPTY: TutorFormValues = {
  fullName: "",
  email: "",
  phone: "",
  status: "APPLIED",
  subjects: "",
  grades: "",
  hourlyRateCents: "",
  notes: "",
};

export function TutorForm({
  mode,
  tutorId,
  initial = EMPTY,
}: {
  mode: "create" | "edit";
  tutorId?: string;
  initial?: TutorFormValues;
}) {
  const [values, setValues] = useState<TutorFormValues>(initial);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<TutorMutationResult | null>(null);
  const router = useRouter();

  function set<K extends keyof TutorFormValues>(k: K, v: TutorFormValues[K]) {
    setValues((prev) => ({ ...prev, [k]: v }));
    setResult(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cents = values.hourlyRateCents.trim();
    const payload = {
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      phone: values.phone.trim() || undefined,
      status: values.status,
      subjects: splitCsv(values.subjects),
      grades: splitCsv(values.grades),
      hourlyRateCents: cents ? Number(cents) : undefined,
      notes: values.notes.trim() || undefined,
    };
    startTransition(async () => {
      const r =
        mode === "create"
          ? await createTutorAction(payload)
          : await updateTutorAction(tutorId, payload);
      setResult(r);
      if (r.ok && mode === "create" && r.id) {
        router.push(`/tutors/${r.id}`);
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
          <Label>Status</Label>
          <Select
            value={values.status}
            onChange={(e) =>
              set(
                "status",
                e.target.value as (typeof TUTOR_STATUS_VALUES)[number],
              )
            }
          >
            {TUTOR_STATUS_VALUES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="subjects">Subjects (comma-separated)</Label>
          <Input
            id="subjects"
            value={values.subjects}
            onChange={(e) => set("subjects", e.target.value)}
            placeholder="Math, Physics, French"
          />
        </div>
        <div>
          <Label htmlFor="grades">Grades (comma-separated)</Label>
          <Input
            id="grades"
            value={values.grades}
            onChange={(e) => set("grades", e.target.value)}
            placeholder="Grade 5, Grade 6, Grade 11"
          />
        </div>
        <div>
          <Label htmlFor="hourlyRateCents">Hourly rate (cents)</Label>
          <Input
            id="hourlyRateCents"
            type="number"
            min={0}
            value={values.hourlyRateCents}
            onChange={(e) => set("hourlyRateCents", e.target.value)}
            placeholder="4000 = $40.00"
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
              ? "Create tutor"
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
