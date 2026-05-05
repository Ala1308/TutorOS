"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { deleteLearningPlanAction } from "../actions";

export function DeleteLearningPlanButton({ planId }: { planId: string }) {
  const [isPending, startTransition] = useTransition();

  function onClick() {
    if (!confirm("Delete this learning plan?")) return;
    startTransition(async () => {
      await deleteLearningPlanAction(planId);
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
