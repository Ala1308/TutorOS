"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import {
  createHomeworkAction,
  updateHomeworkAction,
  type HomeworkMutationResult,
} from "./actions";

export interface HomeworkFormValues {
  studentId: string;
  tutorId: string;
  sessionId: string;
  title: string;
  subject: string;
  instructions: string;
  dueDate: string;
}

const EMPTY: HomeworkFormValues = {
  studentId: "",
  tutorId: "",
  sessionId: "",
  title: "",
  subject: "",
  instructions: "",
  dueDate: "",
};

interface PersonOption {
  id: string;
  label: string;
}

interface Props {
  mode: "create" | "edit";
  homeworkId?: string;
  initial?: HomeworkFormValues;
  studentOptions?: PersonOption[];
  tutorOptions?: PersonOption[];
  lockStudent?: boolean;
}

function localToIso(s: string): string {
  if (!s) return "";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toISOString();
}

function isoToLocal(s: string): string {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function HomeworkForm({
  mode,
  homeworkId,
  initial = EMPTY,
  studentOptions = [],
  tutorOptions = [],
  lockStudent = false,
}: Props) {
  const [values, setValues] = useState<HomeworkFormValues>({
    ...initial,
    dueDate: isoToLocal(initial.dueDate),
  });
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<HomeworkMutationResult | null>(null);
  const router = useRouter();

  function set<K extends keyof HomeworkFormValues>(
    k: K,
    v: HomeworkFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [k]: v }));
    setResult(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload =
      mode === "create"
        ? {
            studentId: values.studentId,
            tutorId: values.tutorId || undefined,
            sessionId: values.sessionId || undefined,
            title: values.title.trim(),
            subject: values.subject.trim() || undefined,
            instructions: values.instructions.trim() || undefined,
            dueDate: localToIso(values.dueDate) || undefined,
          }
        : {
            tutorId: values.tutorId || undefined,
            sessionId: values.sessionId || undefined,
            title: values.title.trim(),
            subject: values.subject.trim() || undefined,
            instructions: values.instructions.trim() || undefined,
            dueDate: localToIso(values.dueDate) || undefined,
          };

    startTransition(async () => {
      const r =
        mode === "create"
          ? await createHomeworkAction(payload)
          : await updateHomeworkAction(homeworkId, payload);
      setResult(r);
      if (r.ok && mode === "create" && r.id) {
        router.push(`/academics/homework/${r.id}`);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {mode === "create" && !lockStudent ? (
          <div>
            <Label>Student *</Label>
            <Select
              value={values.studentId}
              onChange={(e) => set("studentId", e.target.value)}
              required
            >
              <option value="">Choose a student</option>
              {studentOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        <div>
          <Label>Tutor</Label>
          <Select
            value={values.tutorId}
            onChange={(e) => set("tutorId", e.target.value)}
          >
            <option value="">— None —</option>
            {tutorOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          maxLength={200}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            value={values.subject}
            onChange={(e) => set("subject", e.target.value)}
            maxLength={120}
          />
        </div>
        <div>
          <Label htmlFor="dueDate">Due</Label>
          <Input
            id="dueDate"
            type="datetime-local"
            value={values.dueDate}
            onChange={(e) => set("dueDate", e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="instructions">Instructions</Label>
        <Textarea
          id="instructions"
          value={values.instructions}
          onChange={(e) => set("instructions", e.target.value)}
          rows={6}
          maxLength={8000}
          placeholder="What should the student do?"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Saving..."
            : mode === "create"
              ? "Create homework"
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
