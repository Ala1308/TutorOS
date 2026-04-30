import { z } from "zod";

import { defineTool } from "@/lib/ai/toolRegistry";
import { leadService } from "@/lib/services/leadService";

/**
 * Tool: lead.updateScore
 * Category: low (internal mutation, audited inside leadService).
 *
 * The tool layer is intentionally thin — all real work lives in services.
 */
export const leadUpdateScoreTool = defineTool({
  name: "lead.updateScore",
  description: "Set or update the triage score on a Lead.",
  category: "low",
  inputSchema: z.object({
    leadId: z.string().uuid(),
    score: z.number().int().min(0).max(100),
    riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
    riskFlags: z.array(z.string()),
    reasoning: z.string().min(1).max(2000),
  }),
  outputSchema: z.object({
    leadId: z.string().uuid(),
    score: z.number(),
  }),
  requiredRole: ["OWNER", "ADMIN", "ACADEMIC_MANAGER", "AI_AGENT"],
  riskLevel: "LOW",
  handler: async (input, ctx) => {
    const lead = await leadService.setScore({
      leadId: input.leadId,
      score: input.score,
      riskLevel: input.riskLevel,
      riskFlags: input.riskFlags,
      reasoning: input.reasoning,
      actor: ctx.actor,
      ...(ctx.agentRunId ? { agentRunId: ctx.agentRunId } : {}),
    });
    return { leadId: lead.id, score: lead.score ?? 0 };
  },
});
