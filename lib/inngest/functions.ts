/**
 * Re-exports every Inngest function so the route handler at
 * `app/api/inngest/route.ts` can register them in one place.
 *
 * Add new workflow functions in `lib/workflows/<domain>.ts` and re-export here.
 */
export { onLeadCreated } from "@/lib/workflows/leads";
