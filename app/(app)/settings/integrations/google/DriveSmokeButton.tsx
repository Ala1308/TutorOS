"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { createDriveSmokeFolderAction, type DriveSmokeResult } from "./actions";

export function DriveSmokeButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<DriveSmokeResult | null>(null);

  function onClick() {
    setResult(null);
    startTransition(async () => {
      const r = await createDriveSmokeFolderAction();
      setResult(r);
    });
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={onClick}
        disabled={isPending}
      >
        {isPending ? "Creating..." : "Create test folder in Drive"}
      </Button>
      {result ? (
        result.ok ? (
          <p className="text-xs">
            <a
              href={result.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Open folder in Drive
            </a>
          </p>
        ) : (
          <p className="text-xs text-destructive">{result.error}</p>
        )
      ) : null}
    </div>
  );
}
