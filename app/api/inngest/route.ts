import { serve } from "inngest/next";

import { inngest } from "@/lib/inngest/client";
import * as fns from "@/lib/inngest/functions";

/**
 * Single Inngest endpoint. New workflows just need to be re-exported from
 * `lib/inngest/functions.ts` — they show up here automatically.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: Object.values(fns),
});
