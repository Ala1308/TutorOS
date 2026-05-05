"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ASSESSMENT_TYPE_VALUES } from "@/lib/schemas/academics";

import {
  createAssessmentAction,
  updateAssessmentAction,
  type AssessmentMutationResult,
} from "./actions";

export interface AssessmentFormValues {
  studentId: string;
  tutorId: string;
  sessionId: string;
  type: (typeof ASSESSMENT_TYPE_VALUES)[number];
  subject: string;
  title: string;
  scoreNumerator: string;
  scoreDenominator: string;
  level: string;
  observations: string;
  recommendations: string;
  skills: string;
}

const EMPTY: AssessmentFormValues = {
  studentId: "",
  tutorId: "",
  sessionId: "",
  type: "PROGRESS",
  subject: "",
  title: "",
  scoreNumerator: "",
  scoreDenominator: "",
  level: "",
  observations: "",
  recommendations: "",
  skills: "",
};

interface PersonOption {
  id: string;
  label: string;
}

interface Props {
  mode: "create" | "edit";
  assessmentId?: string;
  initial?: AssessmentFormValues;
  studentOptions?: PersonOption[];
  tutorOptions?: PersonOption[];
  /** When true the student dropdown is locked (we're inside a student page). */
  lockStudent?: boolean;
}

function splitCsv(s: string): string[] {
  return Array.from(
    new Set(
      s
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    ),
  );
}

function toIntOrUndefined(s: string): number | undefined {
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

export function AssessmentForm({
  mode,
  assessmentId,
  initial = EMPTY,
  studentOptions = [],
  tutorOptions = [],
  lockStudent = false,
}: Props) {
  const [values, setValues] = useState<AssessmentFormValues>(initial);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<AssessmentMutationResult | null>(null);
  const router = useRouter();

  function set<K extends keyof AssessmentFormValues>(
    k: K,
    v: AssessmentFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [k]: v }));
    setResult(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const skills = splitCsv(values.skills);
    const payload =
      mode === "create"
        ? {
            studentId: values.studentId,
            tutorId: values.tutorId || undefined,
            sessionId: values.sessionId || undefined,
            type: values.type,
            subject: values.subject.trim(),
            title: values.title.trim(),
            scoreNumerator: toIntOrUndefined(values.scoreNumerator),
            scoreDenominator: toIntOrUndefined(values.scoreDenominator),
            level: values.level.trim() || undefined,
            observations: values.observations.trim() || undefined,
            recommendations: values.recommendations.trim() || undefined,
            skills,
          }
        : {
            tutorId: values.tutorId || undefined,
            sessionId: values.sessionId || undefined,
            type: values.type,
            subject: values.subject.trim(),
            title: values.title.trim(),
            scoreNumerator: toIntOrUndefined(values.scoreNumerator) ?? null,
            scoreDenominator: toIntOrUndefined(values.scoreDenominator) ?? null,
            level: values.level.trim() || undefined,
            observations: values.observations.trim() || undefined,
            recommendations: values.recommendations.trim() || undefined,
            skills,
          };

    startTransition(async () => {
      const r =
        mode === "create"
          ? await createAssessmentAction(payload)
          : await updateAssessmentAction(assessmentId, payload);
      setResult(r);
      if (r.ok && mode === "create" && r.id) {
        router.push(`/academics/assessments/${r.id}`);
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
          <Label>Type *</Label>
          <Select
            value={values.type}
            onChange={(e) =>
              set(
                "type",
                e.target.value as (typeof ASSESSMENT_TYPE_VALUES)[number],
              )
            }
            required
          >
            {ASSESSMENT_TYPE_VALUES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>

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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="subject">Subject *</Label>
          <Input
            id="subject"
            value={values.subject}
            onChange={(e) => set("subject", e.target.value)}
            maxLength={120}
            required
          />
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
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor="scoreNumerator">Score</Label>
          <Input
            id="scoreNumerator"
            type="number"
            min={0}
            value={values.scoreNumerator}
            onChange={(e) => set("scoreNumerator", e.target.value)}
            placeholder="e.g. 17"
          />
        </div>
        <div>
          <Label htmlFor="scoreDenominator">Out of</Label>
          <Input
            id="scoreDenominator"
            type="number"
            min={1}
            value={values.scoreDenominator}
            onChange={(e) => set("scoreDenominator", e.target.value)}
            placeholder="e.g. 20"
          />
        </div>
        <div>
          <Label htmlFor="level">Level</Label>
          <Input
            id="level"
            value={values.level}
            onChange={(e) => set("level", e.target.value)}
            placeholder="e.g. Pre-calc 1"
            maxLength={60}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="skills">Skills (comma separated)</Label>
        <Input
          id="skills"
          value={values.skills}
          onChange={(e) => set("skills", e.target.value)}
          placeholder="factoring, polynomials, graphing"
        />
      </div>

      <div>
        <Label htmlFor="observations">Observations</Label>
        <Textarea
          id="observations"
          value={values.observations}
          onChange={(e) => set("observations", e.target.value)}
          rows={4}
          maxLength={8000}
          placeholder="What did you see? Strengths, gaps, behaviour…"
        />
      </div>

      <div>
        <Label htmlFor="recommendations">Recommendations</Label>
        <Textarea
          id="recommendations"
          value={values.recommendations}
          onChange={(e) => set("recommendations", e.target.value)}
          rows={4}
          maxLength={8000}
          placeholder="Concrete next steps for the student…"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Saving..."
            : mode === "create"
              ? "Create assessment"
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
