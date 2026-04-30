import { config as loadEnv } from "dotenv";
import type { Config } from "drizzle-kit";

// Load .env.local first (Next.js convention), fall back to .env
loadEnv({ path: ".env.local" });
loadEnv();

export default {
  schema: "./lib/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
} satisfies Config;
