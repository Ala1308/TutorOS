"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { billSessionAction } from "../actions";

/**
 * One-click "Bill this session" button. Drafts an invoice using the tutor's
 * hourly rate and the session duration, then redirects to the new invoice so
 * the operator can review and send.
 */
export function BillSessionButton({ sessionId }: { sessionId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await billSessionAction(sessionId);
        });
      }}
    >
      {pending ? "Drafting…" : "Bill this session"}
    </Button>
  );
}
