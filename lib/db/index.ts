import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/lib/env";

import * as schema from "./schema";

/**
 * Single shared Drizzle client. Postgres-js with sane connection pool defaults.
 * Use this `db` everywhere; never instantiate another client.
 *
 * Service-role server code that needs to bypass RLS should use a separate,
 * explicitly-named client created in the call site with an audited reason.
 */
const client = postgres(env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  prepare: false,
});

/**
 * SQL query logging is gated behind DRIZZLE_LOG=1 — opt-in only because
 * Drizzle's default logger prints query parameters, which can leak PII
 * (CONTRIBUTING.md §24, §26). Use the structured pino logger in services for
 * everything else.
 */
export const db = drizzle(client, {
  schema,
  logger: process.env.DRIZZLE_LOG === "1",
});

export type Database = typeof db;
export { schema };
