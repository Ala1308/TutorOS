/**
 * App-level loading fallback shown while a route segment is streaming.
 * Renders below the AppShell so navigation chrome stays visible.
 *
 * Per CONTRIBUTING §8: "Loading skeletons should preserve the expected
 * column count." Individual routes with table-heavy layouts can override
 * this with their own `loading.tsx`.
 */
export default function Loading() {
  return (
    <div className="space-y-4 p-6" aria-busy="true" aria-live="polite">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div className="h-4 w-72 animate-pulse rounded-md bg-muted" />
      <div className="grid gap-3 pt-4 md:grid-cols-2">
        <div className="h-32 animate-pulse rounded-md bg-muted" />
        <div className="h-32 animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}
