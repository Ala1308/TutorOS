"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LEARNING_PLAN_STATUS_VALUES } from "@/lib/schemas/academics";

import {
  createLearningPlanAction,
  updateLearningPlanAction,
  type LearningPlanMutationResult,
} from "./actions";

interface GoalRow {
  id: string;
  title: string;
  done: boolean;
  note: string;
}

export interface LearningPlanFormValues {
  studentId: string;
  tutorId: string;
  title: string;
  summary: string;
  subject: string;
  status: (typeof LEARNING_PLAN_STATUS_VALUES)[number];
  startDate: string;
  endDate: string;
  goals: GoalRow[];
}

const EMPTY: LearningPlanFormValues = {
  studentId: "",
  tutorId: "",
  title: "",
  summary: "",
  subject: "",
  status: "DRAFT",
  startDate: "",
  endDate: "",
  goals: [],
};

interface PersonOption {
  id: string;
  label: string;
}

interface Props {
  mode: "create" | "edit";
  planId?: string;
  initial?: LearningPlanFormValues;
  studentOptions?: PersonOption[];
  tutorOptions?: PersonOption[];
  lockStudent?: boolean;
}

function dateToDateInput(s: string): string {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dateInputToIso(s: string): string {
  if (!s) return "";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

let _goalCounter = 0;
function nextGoalId(): string {
  _goalCounter += 1;
  return `g_${Date.now().toString(36)}_${_goalCounter}`;
}

export function LearningPlanForm({
  mode,
  planId,
  initial = EMPTY,
  studentOptions = [],
  tutorOptions = [],
  lockStudent = false,
}: Props) {
  const [values, setValues] = useState<LearningPlanFormValues>({
    ...initial,
    startDate: dateToDateInput(initial.startDate),
    endDate: dateToDateInput(initial.endDate),
  });
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<LearningPlanMutationResult | null>(null);
  const router = useRouter();

  function set<K extends keyof LearningPlanFormValues>(
    k: K,
    v: LearningPlanFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [k]: v }));
    setResult(null);
  }

  function updateGoal(idx: number, patch: Partial<GoalRow>) {
    setValues((prev) => {
      const goals = [...prev.goals];
      const existing = goals[idx];
      if (!existing) return prev;
      goals[idx] = { ...existing, ...patch };
      return { ...prev, goals };
    });
  }

  function addGoal() {
    setValues((prev) => ({
      ...prev,
      goals: [
        ...prev.goals,
        { id: nextGoalId(), title: "", done: false, note: "" },
      ],
    }));
  }

  function removeGoal(idx: number) {
    setValues((prev) => ({
      ...prev,
      goals: prev.goals.filter((_, i) => i !== idx),
    }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const goals = values.goals
      .filter((g) => g.title.trim().length > 0)
      .map((g) => ({
        id: g.id,
        title: g.title.trim(),
        done: g.done,
        ...(g.note.trim() ? { note: g.note.trim() } : {}),
      }));

    const payload =
      mode === "create"
        ? {
            studentId: values.studentId,
            tutorId: values.tutorId || undefined,
            title: values.title.trim(),
            summary: values.summary.trim() || undefined,
            subject: values.subject.trim() || undefined,
            status: values.status,
            startDate: dateInputToIso(values.startDate) || undefined,
            endDate: dateInputToIso(values.endDate) || undefined,
            goals,
          }
        : {
            tutorId: values.tutorId || undefined,
            title: values.title.trim(),
            summary: values.summary.trim() || undefined,
            subject: values.subject.trim() || undefined,
            status: values.status,
            startDate: dateInputToIso(values.startDate) || undefined,
            endDate: dateInputToIso(values.endDate) || undefined,
            goals,
          };

    startTransition(async () => {
      const r =
        mode === "create"
          ? await createLearningPlanAction(payload)
          : await updateLearningPlanAction(planId, payload);
      setResult(r);
      if (r.ok && mode === "create" && r.id) {
        router.push(`/academics/learning-plans/${r.id}`);
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

        <div>
          <Label>Status</Label>
          <Select
            value={values.status}
            onChange={(e) =>
              set(
                "status",
                e.target.value as (typeof LEARNING_PLAN_STATUS_VALUES)[number],
              )
            }
          >
            {LEARNING_PLAN_STATUS_VALUES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
        <div>
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            value={values.subject}
            onChange={(e) => set("subject", e.target.value)}
            maxLength={120}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="startDate">Start</Label>
          <Input
            id="startDate"
            type="date"
            value={values.startDate}
            onChange={(e) => set("startDate", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="endDate">End</Label>
          <Input
            id="endDate"
            type="date"
            value={values.endDate}
            onChange={(e) => set("endDate", e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="summary">Summary</Label>
        <Textarea
          id="summary"
          value={values.summary}
          onChange={(e) => set("summary", e.target.value)}
          rows={3}
          maxLength={8000}
          placeholder="The big picture for this plan."
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Goals</Label>
          <Button type="button" size="sm" variant="outline" onClick={addGoal}>
            Add goal
          </Button>
        </div>
        {values.goals.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No goals yet. Add a few short, observable outcomes.
          </p>
        ) : null}
        {values.goals.map((g, idx) => (
          <div key={g.id} className="space-y-2 rounded-md border p-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={g.done}
                onChange={(e) => updateGoal(idx, { done: e.target.checked })}
                className="h-4 w-4"
              />
              <Input
                value={g.title}
                onChange={(e) => updateGoal(idx, { title: e.target.value })}
                placeholder="Goal title"
                maxLength={200}
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => removeGoal(idx)}
              >
                Remove
              </Button>
            </div>
            <Textarea
              value={g.note}
              onChange={(e) => updateGoal(idx, { note: e.target.value })}
              rows={2}
              maxLength={2000}
              placeholder="Notes / progress (optional)"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Saving..."
            : mode === "create"
              ? "Create plan"
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
