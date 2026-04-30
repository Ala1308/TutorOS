import { z } from "zod";

export const leadCreateSchema = z.object({
  parentName: z.string().min(1).max(200),
  parentEmail: z.string().email(),
  parentPhone: z.string().max(50).optional(),
  studentGrade: z.string().min(1).max(50),
  subjectNeeded: z.string().min(1).max(200),
  message: z.string().max(5000).optional(),
  source: z
    .enum(["WEBSITE", "REFERRAL", "SOCIAL", "PARTNER", "ADS", "OTHER"])
    .default("WEBSITE"),
  consentDataProcessing: z.boolean(),
});

export type LeadCreateInput = z.infer<typeof leadCreateSchema>;

export const leadUpdateStatusSchema = z.object({
  leadId: z.string().uuid(),
  status: z.enum([
    "NEW",
    "CONTACTED",
    "QUALIFIED",
    "DISQUALIFIED",
    "CONVERTED",
    "ARCHIVED",
  ]),
});

export type LeadUpdateStatusInput = z.infer<typeof leadUpdateStatusSchema>;
