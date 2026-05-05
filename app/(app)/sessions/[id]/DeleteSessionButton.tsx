"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { deleteSessionAction } from "../actions";

export function DeleteSessionButton({ sessionId }: { sessionId: string }) {
  const [isPending, startTransition] = useTransition();

  function onClick() {
    if (
      !confirm(
        "Soft-delete this session? Prefer 'Cancel' for completed bookings; delete is for entries created in error.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      await deleteSessionAction(sessionId);
    });
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={onClick}
      disabled={isPending}
      type="button"
    >
      {isPending ? "Deleting..." : "Delete"}
    </Button>
  );
}
