"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { deleteStudentAction } from "../actions";

export function DeleteStudentButton({ studentId }: { studentId: string }) {
  const [isPending, startTransition] = useTransition();

  function onClick() {
    if (!confirm("Soft-delete this student?")) return;
    startTransition(async () => {
      await deleteStudentAction(studentId);
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
