"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { deleteTutorAction } from "../actions";

export function DeleteTutorButton({ tutorId }: { tutorId: string }) {
  const [isPending, startTransition] = useTransition();

  function onClick() {
    if (!confirm("Soft-delete this tutor?")) return;
    startTransition(async () => {
      await deleteTutorAction(tutorId);
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
