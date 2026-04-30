import { z } from "zod";

import { baseAgentOutput } from "./_base";

export const leadScoringInputSchema = z.object({
  parentName: z.string(),
  parentEmail: z.string().email().optional().nullable(),
  parentPhone: z.string().optional().nullable(),
  studentGrade: z.string().optional().nullable(),
  subjectNeeded: z.string().optional().nullable(),
  message: z.string().optional().nullable(),
  source: z
    .enum(["WEBSITE", "REFERRAL", "SOCIAL", "PARTNER", "ADS", "OTHER"])
    .optional(),
});

export type LeadScoringInput = z.infer<typeof leadScoringInputSchema>;

export const leadScoringOutputSchema = baseAgentOutput.extend({
  score: z.number().int().min(0).max(100),
});

export type LeadScoringOutput = z.infer<typeof leadScoringOutputSchema>;
