/**
 * Vitest setup: inject deterministic test env vars BEFORE any test file
 * imports application modules. lib/env.ts validates at import time and would
 * otherwise crash unit tests that don't talk to a real DB.
 *
 * Real integration tests should override DATABASE_URL via the shell
 * (TEST_DATABASE_URL → setup-test-db.ts).
 */
const defaults: Record<string, string> = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://test:test@localhost:5432/test",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  DEFAULT_TIMEZONE: "America/Montreal",
  AGENT_BUDGET_DAILY_USD: "10",
  AGENT_BUDGET_PER_RUN_USD: "1",
  AGENT_DEFAULT_TIMEOUT_MS: "30000",
};

for (const [k, v] of Object.entries(defaults)) {
  if (!process.env[k]) process.env[k] = v;
}
