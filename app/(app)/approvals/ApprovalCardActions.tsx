"use client";

import { useState, useTransition } from "react";

import { ApprovalCard } from "@/components/agents/ApprovalCard";
import { Textarea } from "@/components/ui/textarea";

import { resolveApprovalAction, type ResolveApprovalResult } from "./actions";

import type { ApprovalRequest } from "@/lib/db/schema";

export function ApprovalCardActions({
  approval,
}: {
  approval: ApprovalRequest;
}) {
  const [isPending, startTransition] = useTransition();
  const [reviewNotes, setReviewNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [result, setResult] = useState<ResolveApprovalResult | null>(null);

  function resolve(decision: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED") {
    if (decision === "REJECTED" && reviewNotes.trim().length === 0) {
      setShowNotes(true);
      setResult({ ok: false, error: "Add review notes before rejecting." });
      return;
    }
    setResult(null);
    startTransition(async () => {
      const r = await resolveApprovalAction({
        approvalId: approval.id,
        decision,
        ...(reviewNotes.trim() ? { reviewNotes: reviewNotes.trim() } : {}),
      });
      setResult(r);
    });
  }

  const disabled = isPending || result?.ok === true;
  const handlers = disabled
    ? {}
    : {
        onApprove: () => resolve("APPROVED"),
        onReject: () => resolve("REJECTED"),
        onRequestChanges: () => resolve("CHANGES_REQUESTED"),
      };

  return (
    <div className="space-y-2">
      <ApprovalCard approval={approval} {...handlers} />

      {showNotes && approval.status === "PENDING" ? (
        <Textarea
          value={reviewNotes}
          onChange={(e) => setReviewNotes(e.target.value)}
          placeholder="Review notes (required when rejecting)"
          rows={2}
          className="text-xs"
        />
      ) : null}
      {result ? (
        <p
          className={
            result.ok ? "text-xs text-success" : "text-xs text-destructive"
          }
        >
          {result.ok
            ? `Resolved as ${result.status}${result.applied ? " — change applied." : "."}`
            : result.error}
        </p>
      ) : null}
    </div>
  );
}
