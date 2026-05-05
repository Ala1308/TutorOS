"use client";

import { useState, useTransition } from "react";

import { Select } from "@/components/ui/select";
import { TUTOR_STATUS_VALUES } from "@/lib/schemas/people";

import { setTutorStatusAction, type TutorMutationResult } from "../actions";

export function TutorStatusSelect({
  tutorId,
  initialStatus,
}: {
  tutorId: string;
  initialStatus: (typeof TUTOR_STATUS_VALUES)[number];
}) {
  const [status, setStatus] =
    useState<(typeof TUTOR_STATUS_VALUES)[number]>(initialStatus);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<TutorMutationResult | null>(null);

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as (typeof TUTOR_STATUS_VALUES)[number];
    const previous = status;
    setStatus(next);
    setResult(null);
    startTransition(async () => {
      const r = await setTutorStatusAction({ tutorId, status: next });
      setResult(r);
      if (!r.ok) setStatus(previous);
    });
  }

  return (
    <div className="space-y-2">
      <Select
        value={status}
        onChange={onChange}
        disabled={isPending}
        className="w-48 text-sm"
      >
        {TUTOR_STATUS_VALUES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>
      {result && !result.ok ? (
        <p className="text-xs text-destructive">{result.error}</p>
      ) : null}
    </div>
  );
}
