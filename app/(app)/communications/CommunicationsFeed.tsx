import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { CommunicationItem } from "@/lib/services/commsService";
import { formatDateTime } from "@/lib/utils/dates";

function entityHref(item: CommunicationItem): string | null {
  if (!item.entityType || !item.entityId) return null;
  switch (item.entityType) {
    case "lead":
      return `/leads/${item.entityId}`;
    case "parent":
      return `/parents/${item.entityId}`;
    case "student":
      return `/students/${item.entityId}`;
    case "tutor":
      return `/tutors/${item.entityId}`;
    case "session":
      return `/sessions/${item.entityId}`;
    default:
      return null;
  }
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export function CommunicationsFeed({ items }: { items: CommunicationItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        No communications yet. Use “Log email” or “Log call”.
      </div>
    );
  }

  return (
    <ul className="divide-y rounded-md border">
      {items.map((item) => {
        const href = entityHref(item);
        return (
          <li key={`${item.kind}-${item.id}`} className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant={item.kind === "email" ? "info" : "secondary"}>
                    {item.kind.toUpperCase()}
                  </Badge>
                  <Badge
                    variant={
                      item.direction === "OUTBOUND" ? "success" : "warning"
                    }
                  >
                    {item.direction}
                  </Badge>
                  {item.kind === "call" && item.outcome ? (
                    <Badge variant="outline">{item.outcome}</Badge>
                  ) : null}
                </div>
                <p className="mt-1 truncate text-sm font-medium">
                  {item.subject}
                </p>
                {item.summary ? (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {item.summary}
                  </p>
                ) : null}
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {item.participants.join(", ")}
                  {item.kind === "call" ? (
                    <> · {formatDuration(item.durationSeconds)}</>
                  ) : null}
                </p>
              </div>
              <div className="flex flex-shrink-0 flex-col items-end gap-1 text-xs text-muted-foreground">
                <span>{formatDateTime(item.occurredAt)}</span>
                {href ? (
                  <Link
                    href={href}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    {item.entityType}
                  </Link>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
