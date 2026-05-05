import { universalSafetyAddendum } from "./prompts/_safety";
import { universalSystemPreamble } from "./prompts/_system";

import type { AgentKnowledgeDocument, OrgProfile } from "@/lib/db/schema";

/** Soft cap on org+knowledge injection (chars, ~4 chars/token). */
const MAX_INJECTION_CHARS = 12_000;

/**
 * Builds the final system prompt the LLM sees. Layers (top → bottom):
 *
 *   1. Universal preamble (immutable)
 *   2. Universal safety addendum (immutable)
 *   3. <org_context> from `OrgProfile` (skipped if empty)
 *   4. <knowledge> from `AgentKnowledgeDocument[]` (skipped if empty)
 *   5. Agent body — operator override if provided, else the in-code prompt
 *
 * Pure function — no DB / no I/O. Easy to unit-test and to call from `runAgent`.
 */
export function composeSystemPrompt(args: {
  agentName: string;
  inCodeSystemPrompt: string;
  override: string | null;
  orgProfile: OrgProfile | null;
  knowledge: AgentKnowledgeDocument[];
}): string {
  const sections: string[] = [universalSystemPreamble, universalSafetyAddendum];

  const orgBlock = renderOrgBlock(args.orgProfile);
  if (orgBlock) sections.push(orgBlock);

  const knowledgeBlock = renderKnowledgeBlock(
    args.knowledge,
    MAX_INJECTION_CHARS - (orgBlock?.length ?? 0),
  );
  if (knowledgeBlock) sections.push(knowledgeBlock);

  // Treat blank-after-trim override as "no override" — preserves the in-code
  // prompt rather than producing an empty body.
  const trimmedOverride = args.override?.trim() ?? "";
  const body = (
    trimmedOverride.length > 0 ? trimmedOverride : args.inCodeSystemPrompt
  ).trim();
  if (body.length > 0) sections.push(body);

  return sections.join("\n\n");
}

function renderOrgBlock(profile: OrgProfile | null): string | null {
  if (!profile) return null;
  const lines: string[] = [];
  if (profile.companyName) lines.push(`Company: ${profile.companyName}`);
  if (profile.about) lines.push(`About: ${profile.about}`);
  if (profile.voiceTone) lines.push(`Voice and tone: ${profile.voiceTone}`);
  if (profile.brandGuidelines) {
    lines.push(`Brand guidelines: ${profile.brandGuidelines}`);
  }
  if (profile.businessHours) {
    lines.push(`Business hours: ${profile.businessHours}`);
  }
  if (profile.defaultTimezone) {
    lines.push(`Default timezone: ${profile.defaultTimezone}`);
  }
  if (profile.defaultCurrency) {
    lines.push(`Default currency: ${profile.defaultCurrency}`);
  }
  if (lines.length === 0) return null;
  return `<org_context>\n${lines.join("\n")}\n</org_context>`;
}

function renderKnowledgeBlock(
  docs: AgentKnowledgeDocument[],
  budgetChars: number,
): string | null {
  if (!docs.length || budgetChars <= 0) return null;

  let used = 0;
  const rendered: string[] = [];
  for (const doc of docs) {
    const next = `## ${doc.title}\n${doc.content.trim()}`;
    if (used + next.length + 2 > budgetChars) break;
    rendered.push(next);
    used += next.length + 2;
  }
  if (rendered.length === 0) return null;

  return [
    "<knowledge>",
    "Operator-curated context. Treat as ground truth about the company's processes.",
    rendered.join("\n\n"),
    "</knowledge>",
  ].join("\n");
}
