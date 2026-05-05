"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { deleteParentAction } from "../actions";

export function DeleteParentButton({ parentId }: { parentId: string }) {
  const [isPending, startTransition] = useTransition();

  function onClick() {
    if (
      !confirm(
        "Soft-delete this parent? Students that reference this parent will block the delete in the future — for now you can re-create them via support.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      await deleteParentAction(parentId);
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
