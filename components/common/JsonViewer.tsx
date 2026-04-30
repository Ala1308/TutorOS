import { cn } from "@/lib/utils/cn";

export function JsonViewer({
  value,
  className,
  maxHeight = 320,
}: {
  value: unknown;
  className?: string;
  maxHeight?: number;
}) {
  let pretty: string;
  try {
    pretty = JSON.stringify(value, null, 2);
  } catch {
    pretty = String(value);
  }
  return (
    <pre
      className={cn(
        "overflow-auto rounded-md border bg-muted/40 p-3 text-xs",
        className,
      )}
      style={{ maxHeight }}
    >
      <code>{pretty}</code>
    </pre>
  );
}
