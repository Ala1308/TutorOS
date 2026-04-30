import { EventSchemas, Inngest } from "inngest";

import { env } from "@/lib/env";

import { eventSchemas } from "./events";

/**
 * Single Inngest client. ID stays stable — changing it would orphan running
 * functions in production. Event payload types are derived from the Zod
 * registry in ./events.ts so a type error means an event was sent or
 * subscribed to with a payload that doesn't match its schema.
 */
export const inngest = new Inngest({
  id: "tutoros-ai",
  ...(env.INNGEST_EVENT_KEY ? { eventKey: env.INNGEST_EVENT_KEY } : {}),
  schemas: new EventSchemas().fromZod(eventSchemas),
});
