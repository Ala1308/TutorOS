"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import {
  createSessionAction,
  updateSessionAction,
  type SessionMutationResult,
} from "./actions";

export interface SessionFormValues {
  studentId: string;
  tutorId: string;
  subject: string;
  startTime: string;
  endTime: string;
  googleMeetUrl: string;
  notes: string;
}

const EMPTY: SessionFormValues = {
  studentId: "",
  tutorId: "",
  subject: "",
  startTime: "",
  endTime: "",
  googleMeetUrl: "",
  notes: "",
};

interface PersonOption {
  id: string;
  label: string;
}

interface Props {
  mode: "create" | "edit";
  sessionId?: string;
  initial?: SessionFormValues;
  studentOptions?: PersonOption[];
  tutorOptions?: PersonOption[];
}

/**
 * Converts a `datetime-local` value (e.g. "2026-05-04T15:30") to a real ISO
 * string. The browser already gives a wall-clock time in the user's TZ; we
 * just need it to be parseable by `new Date()`.
 */
function localToIso(s: string): string {
  if (!s) return "";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toISOString();
}

function isoToLocal(s: string): string {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  // datetime-local needs YYYY-MM-DDTHH:MM in local time.
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SessionForm({
  mode,
  sessionId,
  initial = EMPTY,
  studentOptions = [],
  tutorOptions = [],
}: Props) {
  const [values, setValues] = useState<SessionFormValues>({
    ...initial,
    startTime: isoToLocal(initial.startTime),
    endTime: isoToLocal(initial.endTime),
  });
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SessionMutationResult | null>(null);
  const router = useRouter();

  function set<K extends keyof SessionFormValues>(
    k: K,
    v: SessionFormValues[K],
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
            tutorId: values.tutorId,
            subject: values.subject.trim(),
            startTime: localToIso(values.startTime),
            endTime: localToIso(values.endTime),
            googleMeetUrl: values.googleMeetUrl.trim() || undefined,
            notes: values.notes.trim() || undefined,
          }
        : {
            tutorId: values.tutorId || undefined,
            subject: values.subject.trim(),
            startTime: localToIso(values.startTime),
            endTime: localToIso(values.endTime),
            googleMeetUrl: values.googleMeetUrl.trim() || undefined,
            notes: values.notes.trim() || undefined,
          };
    startTransition(async () => {
      const r =
        mode === "create"
          ? await createSessionAction(payload)
          : await updateSessionAction(sessionId, payload);
      setResult(r);
      if (r.ok && mode === "create" && r.id) {
        router.push(`/sessions/${r.id}`);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === "create" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
          <div>
            <Label>Tutor *</Label>
            <Select
              value={values.tutorId}
              onChange={(e) => set("tutorId", e.target.value)}
              required
            >
              <option value="">Choose a tutor</option>
              {tutorOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      ) : (
        <div>
          <Label>Tutor</Label>
          <Select
            value={values.tutorId}
            onChange={(e) => set("tutorId", e.target.value)}
          >
            {tutorOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>
      )}

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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="startTime">Start *</Label>
          <Input
            id="startTime"
            type="datetime-local"
            value={values.startTime}
            onChange={(e) => set("startTime", e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="endTime">End *</Label>
          <Input
            id="endTime"
            type="datetime-local"
            value={values.endTime}
            onChange={(e) => set("endTime", e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="googleMeetUrl">Google Meet URL</Label>
        <Input
          id="googleMeetUrl"
          type="url"
          value={values.googleMeetUrl}
          onChange={(e) => set("googleMeetUrl", e.target.value)}
          placeholder="https://meet.google.com/..."
          maxLength={2048}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Paste a meeting link. Auto-creation will arrive with the Calendar
          integration.
        </p>
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
              ? "Schedule session"
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
