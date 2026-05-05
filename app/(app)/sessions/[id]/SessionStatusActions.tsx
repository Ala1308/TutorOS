"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { SESSION_STATUS_VALUES } from "@/lib/schemas/session";

import { setSessionStatusAction, type SessionMutationResult } from "../actions";

import type { UserRole } from "@/lib/auth/types";

const TRANSITIONS: Record<
  (typeof SESSION_STATUS_VALUES)[number],
  Array<(typeof SESSION_STATUS_VALUES)[number]>
> = {
  SCHEDULED: ["IN_PROGRESS", "CANCELED", "NO_SHOW"],
  IN_PROGRESS: ["COMPLETED", "CANCELED"],
  COMPLETED: [],
  CANCELED: ["SCHEDULED"],
  NO_SHOW: [],
};

function canTransition(role: UserRole, target: string): boolean {
  if (target === "CANCELED") {
    return ["OWNER", "ADMIN", "ACADEMIC_MANAGER"].includes(role);
  }
  if (target === "COMPLETED") {
    return ["OWNER", "ADMIN", "ACADEMIC_MANAGER", "TUTOR"].includes(role);
  }
  return ["OWNER", "ADMIN", "ACADEMIC_MANAGER"].includes(role);
}

export function SessionStatusActions({
  sessionId,
  currentStatus,
  role,
}: {
  sessionId: string;
  currentStatus: (typeof SESSION_STATUS_VALUES)[number];
  role: UserRole;
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SessionMutationResult | null>(null);

  function set(target: (typeof SESSION_STATUS_VALUES)[number]) {
    setResult(null);
    startTransition(async () => {
      const r = await setSessionStatusAction({
        sessionId,
        status: target,
      });
      setResult(r);
    });
  }

  const next = TRANSITIONS[currentStatus] ?? [];
  const allowed = next.filter((t) => canTransition(role, t));

  return (
    <div className="space-y-2">
      <p className="text-sm">
        Current status: <span className="font-mono">{currentStatus}</span>
      </p>
      {allowed.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No further status changes available from this state.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {allowed.map((t) => (
            <Button
              key={t}
              size="sm"
              variant={t === "CANCELED" ? "destructive" : "secondary"}
              onClick={() => set(t)}
              disabled={isPending}
              type="button"
            >
              Mark {t.toLowerCase().replace("_", " ")}
            </Button>
          ))}
        </div>
      )}
      {result && !result.ok ? (
        <p className="text-xs text-destructive">{result.error}</p>
      ) : null}
    </div>
  );
}
