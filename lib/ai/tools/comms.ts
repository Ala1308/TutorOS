import { z } from "zod";

import { defineTool } from "@/lib/ai/toolRegistry";
import { COMM_ENTITY_TYPE_VALUES } from "@/lib/schemas/comms";
import { commsService } from "@/lib/services/commsService";

const ROLES = ["OWNER", "ADMIN", "ACADEMIC_MANAGER", "AI_AGENT"] as const;

const COMM_DIRECTIONS = ["INBOUND", "OUTBOUND"] as const;
const CALL_OUTCOMES = [
  "ANSWERED",
  "VOICEMAIL",
  "NO_ANSWER",
  "BUSY",
  "FAILED",
] as const;

/**
 * Tool: comm.logEmail
 *
 * LOW risk — records that an email happened. Use this from agents that send
 * email through external providers (Gmail / Resend / etc) to keep the
 * communications log honest. Always pass the (entityType, entityId) when
 * known so the email shows up on the linked record.
 */
export const commLogEmailTool = defineTool({
  name: "comm.logEmail",
  description:
    "Log an email send/receive. Pass (entityType, entityId) together to link to a parent / lead / student / tutor / session.",
  category: "low",
  inputSchema: z
    .object({
      direction: z.enum(COMM_DIRECTIONS).optional(),
      subject: z.string().min(1).max(300),
      fromEmail: z.string().email().max(200),
      toEmails: z.array(z.string().email().max(200)).min(1).max(50),
      ccEmails: z.array(z.string().email().max(200)).max(50).optional(),
      bccEmails: z.array(z.string().email().max(200)).max(50).optional(),
      bodyPreview: z.string().max(2000).optional(),
      sentAt: z.string().datetime().optional(),
      entityType: z.enum(COMM_ENTITY_TYPE_VALUES).optional(),
      entityId: z.string().min(1).max(200).optional(),
      gmailThreadId: z.string().max(200).optional(),
    })
    .refine(
      (v) =>
        (v.entityType === undefined && v.entityId === undefined) ||
        (v.entityType !== undefined && v.entityId !== undefined),
      {
        message: "Provide both entityType and entityId, or neither",
        path: ["entityId"],
      },
    ),
  outputSchema: z.object({
    emailId: z.string().uuid(),
    direction: z.string(),
    subject: z.string(),
  }),
  requiredRole: [...ROLES],
  riskLevel: "LOW",
  handler: async (input, ctx) => {
    const row = await commsService.logEmail(
      {
        ...input,
        direction: input.direction ?? "OUTBOUND",
        ccEmails: input.ccEmails ?? [],
        bccEmails: input.bccEmails ?? [],
      },
      { actor: ctx.actor },
    );
    return {
      emailId: row.id,
      direction: row.direction,
      subject: row.subject,
    };
  },
});

/**
 * Tool: comm.logCall
 *
 * LOW risk — records a phone / voice call. Voice provider adapters can
 * call this to persist a transcript-aware summary into the unified log.
 */
export const commLogCallTool = defineTool({
  name: "comm.logCall",
  description:
    "Log a phone call. Pass durationSeconds when known and (entityType, entityId) together to link to a record.",
  category: "low",
  inputSchema: z
    .object({
      direction: z.enum(COMM_DIRECTIONS),
      fromNumber: z.string().max(40).optional(),
      toNumber: z.string().max(40).optional(),
      summary: z.string().max(8000).optional(),
      transcriptUrl: z.string().url().max(2048).optional(),
      recordingUrl: z.string().url().max(2048).optional(),
      outcome: z.enum(CALL_OUTCOMES).optional(),
      durationSeconds: z
        .number()
        .int()
        .min(0)
        .max(60 * 60 * 12)
        .optional(),
      occurredAt: z.string().datetime().optional(),
      entityType: z.enum(COMM_ENTITY_TYPE_VALUES).optional(),
      entityId: z.string().min(1).max(200).optional(),
      provider: z.string().max(40).optional(),
      providerCallId: z.string().max(200).optional(),
    })
    .refine(
      (v) =>
        (v.entityType === undefined && v.entityId === undefined) ||
        (v.entityType !== undefined && v.entityId !== undefined),
      {
        message: "Provide both entityType and entityId, or neither",
        path: ["entityId"],
      },
    ),
  outputSchema: z.object({
    callId: z.string().uuid(),
    direction: z.string(),
    outcome: z.string().nullable(),
  }),
  requiredRole: [...ROLES],
  riskLevel: "LOW",
  handler: async (input, ctx) => {
    const row = await commsService.logCall(input, { actor: ctx.actor });
    return {
      callId: row.id,
      direction: row.direction,
      outcome: row.outcome ?? null,
    };
  },
});
