import { cn } from "@/lib/utils/cn";

import { EmptyState } from "./EmptyState";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

/**
 * Minimal server-rendered table. For interactive tables (sort, search,
 * pagination) wrap @tanstack/react-table inside this component on the client
 * — the public API stays the same.
 */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  emptyTitle = "No data",
  emptyDescription,
  className,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        {...(emptyDescription ? { description: emptyDescription } : {})}
      />
    );
  }

  return (
    <div className={cn("w-full overflow-auto rounded-lg border", className)}>
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted/50 text-left">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  "px-4 py-2 font-medium text-muted-foreground",
                  c.className,
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-t hover:bg-muted/30">
              {columns.map((c) => (
                <td key={c.key} className={cn("px-4 py-2", c.className)}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
