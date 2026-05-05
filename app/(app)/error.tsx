"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * App-level error boundary. Renders below the AppShell layout. Logs to
 * the browser console (server logs already captured the original error
 * via `lib/logger`). The "Try again" action calls `reset()` to re-attempt
 * the failing segment without a full reload.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("AppError boundary caught:", error);
    }
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
      <div>
        <p className="text-sm font-medium">Something went wrong</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try again or refresh the page. If the problem persists, check the
          server logs.
        </p>
        {error.digest ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Reference: <code>{error.digest}</code>
          </p>
        ) : null}
      </div>
      <Button size="sm" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
