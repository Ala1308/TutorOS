import { z } from "zod";

const TUTOR_STATUSES = [
  "APPLIED",
  "SCREENING",
  "TEST_SENT",
  "INTERVIEW",
  "ACTIVE",
  "INACTIVE",
  "REJECTED",
] as const;

const optionalTrimmedString = (max: number) =>
  z
    .string()
    .max(max)
    .transform((s) => s.trim())
    .optional()
    .or(z.literal(""))
    .transform((s) => (s ? s : undefined));

const optionalEmail = z
  .string()
  .max(200)
  .optional()
  .or(z.literal(""))
  .transform((s) => (s ? s : undefined))
  .refine((s) => s === undefined || z.string().email().safeParse(s).success, {
    message: "Invalid email",
  });

/**
 * Splits a comma-separated string into a deduped, trimmed list. Used for
 * subjects/grades inputs in the people forms.
 */
export function splitCsv(s: string | null | undefined): string[] {
  if (!s) return [];
  return Array.from(
    new Set(
      s
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    ),
  );
}

export const parentCreateSchema = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().email().max(200),
  phone: optionalTrimmedString(40),
  timezone: optionalTrimmedString(64),
  notes: optionalTrimmedString(4000),
});
export type ParentCreateInput = z.infer<typeof parentCreateSchema>;

export const parentUpdateSchema = parentCreateSchema.partial();
export type ParentUpdateInput = z.infer<typeof parentUpdateSchema>;

export const studentCreateSchema = z.object({
  parentId: z.string().uuid(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  grade: optionalTrimmedString(40),
  school: optionalTrimmedString(200),
  subjects: z.array(z.string().min(1).max(60)).max(40).default([]),
  isMinor: z.boolean().default(true),
  timezone: optionalTrimmedString(64),
  notes: optionalTrimmedString(4000),
});
export type StudentCreateInput = z.infer<typeof studentCreateSchema>;

export const studentUpdateSchema = studentCreateSchema
  .partial()
  .omit({ parentId: true });
export type StudentUpdateInput = z.infer<typeof studentUpdateSchema>;

export const tutorCreateSchema = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().email().max(200),
  phone: optionalTrimmedString(40),
  status: z.enum(TUTOR_STATUSES).default("APPLIED"),
  subjects: z.array(z.string().min(1).max(60)).max(60).default([]),
  grades: z.array(z.string().min(1).max(40)).max(40).default([]),
  hourlyRateCents: z.number().int().min(0).max(100_000).optional(),
  notes: optionalTrimmedString(4000),
});
export type TutorCreateInput = z.infer<typeof tutorCreateSchema>;

export const tutorUpdateSchema = tutorCreateSchema.partial();
export type TutorUpdateInput = z.infer<typeof tutorUpdateSchema>;

export const tutorStatusUpdateSchema = z.object({
  tutorId: z.string().uuid(),
  status: z.enum(TUTOR_STATUSES),
});
export type TutorStatusUpdateInput = z.infer<typeof tutorStatusUpdateSchema>;

// Re-export for UI consumers.
export const TUTOR_STATUS_VALUES = TUTOR_STATUSES;

// Quiet unused-var lint: optionalEmail is exported in case future callers need it.
export { optionalEmail };
