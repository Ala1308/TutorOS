"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { deleteAssessmentAction } from "../actions";

export function DeleteAssessmentButton({
  assessmentId,
}: {
  assessmentId: string;
}) {
  const [isPending, startTransition] = useTransition();

  function onClick() {
    if (
      !confirm("Delete this assessment? It can be restored manually if needed.")
    )
      return;
    startTransition(async () => {
      await deleteAssessmentAction(assessmentId);
    });
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={onClick}
      disabled={isPending}
    >
      {isPending ? "Deleting..." : "Delete"}
    </Button>
  );
}
