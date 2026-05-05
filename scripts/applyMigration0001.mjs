// One-off helper: apply a specific drizzle migration file against DATABASE_URL.
// Usage:  node scripts/applyMigration0001.mjs [file]
// Defaults to drizzle/0001_unique_kate_bishop.sql for backwards compat.
// Safe to re-run: every statement uses IF NOT EXISTS / DO $$ guards.
import { config as loadEnv } from "dotenv";
import postgres from "postgres";
import fs from "node:fs/promises";
import path from "node:path";

loadEnv({ path: ".env.local" });
loadEnv();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sqlFile =
  process.argv[2] ?? path.join("drizzle", "0001_unique_kate_bishop.sql");
const raw = await fs.readFile(sqlFile, "utf8");
// drizzle uses --> statement-breakpoint to separate statements
const statements = raw
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean);

const sql = postgres(url, { max: 1, prepare: false });
try {
  for (const stmt of statements) {
    console.log("Executing:", stmt.split("\n")[0].slice(0, 80), "...");
    await sql.unsafe(stmt);
  }
  console.log(`Applied ${statements.length} statements from ${sqlFile}`);
} finally {
  await sql.end({ timeout: 5 });
}
