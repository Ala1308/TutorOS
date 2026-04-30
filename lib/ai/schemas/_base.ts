import { z } from "zod";

/**
 * Universal output contract every agent's output schema must extend.
 * The runtime validates this exact shape, so adding required fields here
 * forces every agent to produce them.
 */
export const baseAgentOutput = z.object({
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("0..1 — set < 0.75 if any input was missing or ambiguous"),
  riskLevel: z
    .enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
    .describe(
      "LOW for purely informational; HIGH/CRITICAL must require approval",
    ),
  riskFlags: z
    .array(z.string())
    .default([])
    .describe(
      "short snake_case flags, e.g. ['missing_phone', 'minor_subject']",
    ),
  reasoning: z
    .string()
    .min(1)
    .max(2000)
    .describe("brief explanation of the decision"),
  requiresHumanApproval: z.boolean(),
  approvalReason: z.string().optional(),
});

export type BaseAgentOutput = z.infer<typeof baseAgentOutput>;
