import { defineAgent } from "@/lib/ai/registry";
import { leadScoringSystemPrompt } from "@/lib/ai/prompts/leadScoring";
import {
  leadScoringInputSchema,
  leadScoringOutputSchema,
} from "@/lib/ai/schemas/leadScoring";

/**
 * Reads a freshly-submitted lead and produces a triage score + risk + reasoning.
 * Output is treated as a draft until the operator approves (or until the
 * operator switches `lead.scoring` to FULL_AUTO).
 */
export const leadScoringAgent = defineAgent({
  name: "leadScoring",
  version: 1,
  purpose: "Triage inbound parent inquiries and produce a 0-100 lead score.",
  model: { provider: "anthropic", model: "claude-sonnet-4-latest" },
  systemPrompt: leadScoringSystemPrompt,
  inputSchema: leadScoringInputSchema,
  outputSchema: leadScoringOutputSchema,
  allowedTools: ["lead.updateScore"],
  workflowStep: "lead.scoring",
  defaultAutomationLevel: "DRAFT_ONLY",
  confidenceThreshold: 0.75,
  maxRiskLevel: "MEDIUM",
  costCapCents: 50,
  timeoutMs: 30_000,
});
