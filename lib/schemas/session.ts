import { z } from "zod";

const SESSION_STATUSES = [
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELED",
  "NO_SHOW",
] as const;

const isoDateTime = z
  .string()
  .min(10)
  .refine((s) => !Number.isNaN(Date.parse(s)), {
    message: "Invalid date/time",
  });

const optionalUrl = z
  .string()
  .max(2048)
  .url()
  .optional()
  .or(z.literal(""))
  .transform((s) => (s ? s : undefined));

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((s) => (s ? s.trim() : undefined));

export const sessionCreateSchema = z
  .object({
    studentId: z.string().uuid(),
    tutorId: z.string().uuid(),
    subject: z.string().min(1).max(120),
    startTime: isoDateTime,
    endTime: isoDateTime,
    googleMeetUrl: optionalUrl,
    notes: optionalText(4000),
  })
  .refine((v) => Date.parse(v.endTime) > Date.parse(v.startTime), {
    message: "endTime must be after startTime",
    path: ["endTime"],
  });
export type SessionCreateInput = z.infer<typeof sessionCreateSchema>;

export const sessionUpdateSchema = z
  .object({
    subject: z.string().min(1).max(120).optional(),
    startTime: isoDateTime.optional(),
    endTime: isoDateTime.optional(),
    tutorId: z.string().uuid().optional(),
    googleMeetUrl: optionalUrl,
    notes: optionalText(4000),
  })
  .refine(
    (v) =>
      !v.startTime ||
      !v.endTime ||
      Date.parse(v.endTime) > Date.parse(v.startTime),
    { message: "endTime must be after startTime", path: ["endTime"] },
  );
export type SessionUpdateInput = z.infer<typeof sessionUpdateSchema>;

export const sessionStatusSchema = z.object({
  sessionId: z.string().uuid(),
  status: z.enum(SESSION_STATUSES),
});
export type SessionStatusInput = z.infer<typeof sessionStatusSchema>;

export const SESSION_STATUS_VALUES = SESSION_STATUSES;
