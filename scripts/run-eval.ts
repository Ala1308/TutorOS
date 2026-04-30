/* eslint-disable no-console */
import { runAgent } from "@/lib/ai/runAgent";
import "@/lib/ai/registry.bootstrap";
import { SYSTEM_ACTOR } from "@/lib/auth/types";

/**
 * Tiny eval runner. Usage:
 *   npm run eval -- leadScoring
 *
 * Looks for `lib/ai/evals/<agent>.eval.ts` exporting `cases`, runs each one,
 * prints a pass/fail summary, exits non-zero on any failure.
 */
async function main() {
  const agent = process.argv[2];
  if (!agent) {
    console.error("Usage: npm run eval -- <agent>");
    process.exit(1);
  }

  const mod = await import(`@/lib/ai/evals/${agent}.eval`);
  const cases = mod.cases as Array<{
    name: string;
    input: unknown;
    expect: (output: unknown) => { ok: boolean; reason?: string };
  }>;

  let passed = 0;
  let failed = 0;

  for (const c of cases) {
    process.stdout.write(`  • ${c.name} ... `);
    try {
      const result = await runAgent({
        agentName: agent,
        input: c.input,
        context: { actor: SYSTEM_ACTOR, triggerSource: "manual" },
      });
      const verdict = c.expect(result.output);
      if (verdict.ok) {
        passed++;
        console.log("PASS");
      } else {
        failed++;
        console.log(`FAIL${verdict.reason ? ` (${verdict.reason})` : ""}`);
      }
    } catch (err) {
      failed++;
      console.log(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
