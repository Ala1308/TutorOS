import { JsonViewer } from "./JsonViewer";

/**
 * Side-by-side current vs proposed view. Plain JSON for now; swap with a real
 * structural diff later (the component contract stays the same).
 */
export function DiffViewer({
  current,
  proposed,
}: {
  current: unknown;
  proposed: unknown;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">
          Current
        </p>
        <JsonViewer value={current ?? null} />
      </div>
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">
          Proposed
        </p>
        <JsonViewer value={proposed ?? null} />
      </div>
    </div>
  );
}
