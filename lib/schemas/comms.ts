import { z } from "zod";

export const COMM_ENTITY_TYPES = [
  "lead",
  "parent",
  "student",
  "tutor",
  "session",
] as const;

const COMM_DIRECTIONS = ["INBOUND", "OUTBOUND"] as const;
const CALL_OUTCOMES = [
  "ANSWERED",
  "VOICEMAIL",
  "NO_ANSWER",
  "BUSY",
  "FAILED",
] as const;

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((s) => (s ? s.trim() : undefined));

const optionalIso = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((s) => (s ? s : undefined))
  .refine((s) => s === undefined || !Number.isNaN(Date.parse(s)), {
    message: "Invalid date",
  });

const optionalEntityType = z
  .enum(COMM_ENTITY_TYPES)
  .optional()
  .or(z.literal(""))
  .transform((s) => (s ? s : undefined));

const optionalEntityId = z
  .string()
  .max(200)
  .optional()
  .or(z.literal(""))
  .transform((s) => (s ? s : undefined));

const emailListSchema = z
  .array(z.string().email().max(200))
  .max(50)
  .default([]);

export const emailLogSchema = z
  .object({
    direction: z.enum(COMM_DIRECTIONS).default("OUTBOUND"),
    subject: z.string().min(1).max(300),
    fromEmail: z.string().email().max(200),
    toEmails: z.array(z.string().email().max(200)).min(1).max(50),
    ccEmails: emailListSchema,
    bccEmails: emailListSchema,
    bodyPreview: optionalText(2000),
    sentAt: optionalIso,
    entityType: optionalEntityType,
    entityId: optionalEntityId,
    gmailThreadId: optionalText(200),
  })
  .refine(
    (v) =>
      (v.entityType === undefined && v.entityId === undefined) ||
      (v.entityType !== undefined && v.entityId !== undefined),
    {
      message: "Provide both entity type and id, or neither",
      path: ["entityId"],
    },
  );
export type EmailLogInput = z.infer<typeof emailLogSchema>;

export const callLogSchema = z
  .object({
    direction: z.enum(COMM_DIRECTIONS),
    fromNumber: optionalText(40),
    toNumber: optionalText(40),
    summary: optionalText(8000),
    transcriptUrl: optionalText(2048),
    recordingUrl: optionalText(2048),
    outcome: z.enum(CALL_OUTCOMES).optional(),
    durationSeconds: z
      .number()
      .int()
      .min(0)
      .max(60 * 60 * 12)
      .optional(),
    occurredAt: optionalIso,
    entityType: optionalEntityType,
    entityId: optionalEntityId,
    provider: optionalText(40),
    providerCallId: optionalText(200),
  })
  .refine(
    (v) =>
      (v.entityType === undefined && v.entityId === undefined) ||
      (v.entityType !== undefined && v.entityId !== undefined),
    {
      message: "Provide both entity type and id, or neither",
      path: ["entityId"],
    },
  );
export type CallLogInput = z.infer<typeof callLogSchema>;

export const COMM_ENTITY_TYPE_VALUES = COMM_ENTITY_TYPES;
export const COMM_DIRECTION_VALUES = COMM_DIRECTIONS;
export const CALL_OUTCOME_VALUES = CALL_OUTCOMES;
