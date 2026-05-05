import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    environment: "node",
    globals: false,
    setupFiles: ["./tests/setup.ts"],
    reporters: process.env.CI ? ["default", "github-actions"] : ["default"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["lib/**/*.ts"],
      exclude: [
        "lib/db/supabase-types.ts",
        "lib/**/*.d.ts",
        "lib/inngest/**",
        "lib/ai/registry.bootstrap.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // `server-only` is injected by the Next.js bundler at build time; in
      // node/test runs it has nothing to resolve to, so we point it at an
      // empty stub. This keeps server-only enforcement at build time
      // (where it matters) without breaking unit tests that import service
      // modules whose only client-vs-server protection is that import.
      "server-only": fileURLToPath(
        new URL("./tests/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
});
