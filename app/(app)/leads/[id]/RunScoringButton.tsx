"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import {
  runLeadScoringAction,
  type RunLeadScoringActionResult,
} from "../actions";

export function RunScoringButton({
  leadId,
  hasPendingApproval,
}: {
  leadId: string;
  hasPendingApproval?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<RunLeadScoringActionResult | null>(null);

  function onClick() {
    setResult(null);
    startTransition(async () => {
      const r = await runLeadScoringAction({ leadId });
      setResult(r);
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        size="sm"
        onClick={onClick}
        disabled={isPending || hasPendingApproval}
        title={
          hasPendingApproval
            ? "An approval is already pending for this lead"
            : undefined
        }
      >
        {isPending ? "Scoring..." : "Run lead scoring"}
      </Button>
      {result ? (
        <p
          className={
            result.ok ? "text-xs text-success" : "text-xs text-destructive"
          }
        >
          {result.ok
            ? result.kind === "APPLY"
              ? `Applied score ${result.score}/100.`
              : `Score ${result.score}/100 awaiting your approval.`
            : result.error}
        </p>
      ) : null}
    </div>
  );
}
