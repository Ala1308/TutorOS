"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { splitCsv } from "@/lib/schemas/people";

import {
  createStudentAction,
  updateStudentAction,
  type StudentMutationResult,
} from "./actions";

export interface StudentFormValues {
  firstName: string;
  lastName: string;
  grade: string;
  school: string;
  subjects: string;
  isMinor: boolean;
  timezone: string;
  notes: string;
}

const EMPTY: StudentFormValues = {
  firstName: "",
  lastName: "",
  grade: "",
  school: "",
  subjects: "",
  isMinor: true,
  timezone: "",
  notes: "",
};

interface ParentOption {
  id: string;
  fullName: string;
  email: string;
}

interface Props {
  mode: "create" | "edit";
  studentId?: string;
  /** Required for create. Either pre-selected via prop or chosen from `parents`. */
  initialParentId?: string;
  parents?: ParentOption[];
  initial?: StudentFormValues;
}

export function StudentForm({
  mode,
  studentId,
  initialParentId,
  parents = [],
  initial = EMPTY,
}: Props) {
  const [values, setValues] = useState<StudentFormValues>(initial);
  const [parentId, setParentId] = useState<string>(initialParentId ?? "");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<StudentMutationResult | null>(null);
  const router = useRouter();

  function set<K extends keyof StudentFormValues>(
    k: K,
    v: StudentFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [k]: v }));
    setResult(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "create" && !parentId) {
      setResult({ ok: false, error: "Pick a parent first." });
      return;
    }
    const payload = {
      ...(mode === "create" ? { parentId } : {}),
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      grade: values.grade.trim() || undefined,
      school: values.school.trim() || undefined,
      subjects: splitCsv(values.subjects),
      isMinor: values.isMinor,
      timezone: values.timezone.trim() || undefined,
      notes: values.notes.trim() || undefined,
    };
    startTransition(async () => {
      const r =
        mode === "create"
          ? await createStudentAction(payload)
          : await updateStudentAction(studentId, payload);
      setResult(r);
      if (r.ok && mode === "create" && r.id) {
        router.push(`/students/${r.id}`);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === "create" ? (
        <div>
          <Label>Parent *</Label>
          <Select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            required
          >
            <option value="">Choose a parent</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName} ({p.email})
              </option>
            ))}
          </Select>
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="firstName">First name *</Label>
          <Input
            id="firstName"
            value={values.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            maxLength={100}
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last name *</Label>
          <Input
            id="lastName"
            value={values.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            maxLength={100}
            required
          />
        </div>
        <div>
          <Label htmlFor="grade">Grade</Label>
          <Input
            id="grade"
            value={values.grade}
            onChange={(e) => set("grade", e.target.value)}
            maxLength={40}
          />
        </div>
        <div>
          <Label htmlFor="school">School</Label>
          <Input
            id="school"
            value={values.school}
            onChange={(e) => set("school", e.target.value)}
            maxLength={200}
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="subjects">Subjects (comma-separated)</Label>
          <Input
            id="subjects"
            value={values.subjects}
            onChange={(e) => set("subjects", e.target.value)}
            placeholder="Math, Physics, French"
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
        <label className="flex items-center gap-2 pt-6 text-sm">
          <input
            type="checkbox"
            checked={values.isMinor}
            onChange={(e) => set("isMinor", e.target.checked)}
          />
          Student is a minor
        </label>
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
              ? "Create student"
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
