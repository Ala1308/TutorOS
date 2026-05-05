"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { deleteHomeworkAction } from "../actions";

export function DeleteHomeworkButton({ homeworkId }: { homeworkId: string }) {
  const [isPending, startTransition] = useTransition();

  function onClick() {
    if (!confirm("Delete this homework?")) return;
    startTransition(async () => {
      await deleteHomeworkAction(homeworkId);
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
