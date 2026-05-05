"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { UserRole } from "@/lib/auth/types";

import {
  setHomeworkStatusAction,
  type HomeworkMutationResult,
} from "../actions";

interface Props {
  homeworkId: string;
  currentStatus: string;
  role: UserRole;
}

export function HomeworkStatusActions({
  homeworkId,
  currentStatus,
  role,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<HomeworkMutationResult | null>(null);

  const [submissionUrl, setSubmissionUrl] = useState("");
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [grade, setGrade] = useState("");
  const [scorePercent, setScorePercent] = useState("");
  const [feedback, setFeedback] = useState("");

  const canReview =
    role === "OWNER" ||
    role === "ADMIN" ||
    role === "ACADEMIC_MANAGER" ||
    role === "TUTOR";

  function go(status: string, extra: Record<string, unknown> = {}) {
    startTransition(async () => {
      const r = await setHomeworkStatusAction({
        homeworkId,
        status,
        ...extra,
      });
      setResult(r);
    });
  }

  function submit() {
    go("SUBMITTED", {
      submissionUrl: submissionUrl.trim() || undefined,
      submissionNotes: submissionNotes.trim() || undefined,
    });
  }

  function review() {
    const score = scorePercent ? Number(scorePercent) : undefined;
    go("REVIEWED", {
      grade: grade.trim() || undefined,
      scorePercent:
        score !== undefined && Number.isFinite(score)
          ? Math.round(score)
          : undefined,
      feedback: feedback.trim() || undefined,
    });
  }

  return (
    <div className="space-y-4 text-sm">
      <p className="text-xs text-muted-foreground">
        Current: <span className="font-mono">{currentStatus}</span>
      </p>

      {currentStatus === "ASSIGNED" ? (
        <div className="space-y-2 rounded-md border p-3">
          <p className="font-medium">Submit work</p>
          <div>
            <Label htmlFor="hwUrl">Submission URL</Label>
            <Input
              id="hwUrl"
              type="url"
              value={submissionUrl}
              onChange={(e) => setSubmissionUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
            />
          </div>
          <div>
            <Label htmlFor="hwNotes">Notes</Label>
            <Textarea
              id="hwNotes"
              value={submissionNotes}
              onChange={(e) => setSubmissionNotes(e.target.value)}
              rows={3}
              maxLength={8000}
            />
          </div>
          <Button size="sm" disabled={isPending} onClick={submit}>
            Mark submitted
          </Button>
        </div>
      ) : null}

      {canReview && currentStatus === "SUBMITTED" ? (
        <div className="space-y-2 rounded-md border p-3">
          <p className="font-medium">Review</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="hwGrade">Grade</Label>
              <Input
                id="hwGrade"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="A / 4 / Pass"
                maxLength={20}
              />
            </div>
            <div>
              <Label htmlFor="hwScore">Score %</Label>
              <Input
                id="hwScore"
                type="number"
                min={0}
                max={100}
                value={scorePercent}
                onChange={(e) => setScorePercent(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="hwFeedback">Feedback</Label>
            <Textarea
              id="hwFeedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
              maxLength={8000}
            />
          </div>
          <Button size="sm" disabled={isPending} onClick={review}>
            Mark reviewed
          </Button>
        </div>
      ) : null}

      {canReview ? (
        <div className="flex flex-wrap items-center gap-2">
          {currentStatus !== "COMPLETED" ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={isPending}
              onClick={() => go("COMPLETED")}
            >
              Mark completed
            </Button>
          ) : null}
          {currentStatus !== "MISSED" ? (
            <Button
              size="sm"
              variant="destructive"
              disabled={isPending}
              onClick={() => go("MISSED")}
            >
              Mark missed
            </Button>
          ) : null}
          {currentStatus !== "ASSIGNED" ? (
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => go("ASSIGNED")}
            >
              Reset to assigned
            </Button>
          ) : null}
        </div>
      ) : null}

      {result?.ok ? (
        <p className="text-xs text-muted-foreground">Saved.</p>
      ) : null}
      {result && !result.ok ? (
        <p className="text-xs text-destructive">{result.error}</p>
      ) : null}
    </div>
  );
}
