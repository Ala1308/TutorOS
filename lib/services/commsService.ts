import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  callRecords,
  emailThreads,
  type CallRecord,
  type EmailThread,
  type NewCallRecord,
  type NewEmailThread,
} from "@/lib/db/schema";
import {
  callLogSchema,
  emailLogSchema,
  type CallLogInput,
  type EmailLogInput,
} from "@/lib/schemas/comms";

import type { Actor } from "@/lib/auth/types";

import { auditService } from "./auditService";

const ENTITY_EMAIL = "EmailThread";
const ENTITY_CALL = "CallRecord";

export type CommunicationItem =
  | {
      kind: "email";
      id: string;
      direction: "INBOUND" | "OUTBOUND";
      subject: string;
      summary: string | null;
      participants: string[];
      occurredAt: Date;
      entityType: string | null;
      entityId: string | null;
    }
  | {
      kind: "call";
      id: string;
      direction: "INBOUND" | "OUTBOUND";
      subject: string;
      summary: string | null;
      participants: string[];
      occurredAt: Date;
      durationSeconds: number | null;
      outcome: string | null;
      entityType: string | null;
      entityId: string | null;
    };

function toEmailItem(e: EmailThread): CommunicationItem {
  const participants = [e.fromEmail, ...(e.toEmails ?? [])];
  return {
    kind: "email",
    id: e.id,
    direction: e.direction,
    subject: e.subject,
    summary: e.bodyPreview,
    participants,
    occurredAt: e.sentAt ?? e.createdAt,
    entityType: e.entityType,
    entityId: e.entityId,
  };
}

function toCallItem(c: CallRecord): CommunicationItem {
  const participants = [c.fromNumber, c.toNumber].filter((s): s is string =>
    Boolean(s),
  );
  return {
    kind: "call",
    id: c.id,
    direction: c.direction,
    subject:
      c.direction === "OUTBOUND"
        ? `Call to ${c.toNumber ?? "?"}`
        : `Call from ${c.fromNumber ?? "?"}`,
    summary: c.summary,
    participants,
    occurredAt: c.occurredAt,
    durationSeconds: c.durationSeconds,
    outcome: c.outcome,
    entityType: c.entityType,
    entityId: c.entityId,
  };
}

export const commsService = {
  /**
   * Unified feed across email + call logs, optionally filtered to a single
   * (entityType, entityId) pair. Sorted by occurredAt desc.
   */
  async list(
    args: {
      limit?: number;
      entityType?: string;
      entityId?: string;
    } = {},
  ): Promise<CommunicationItem[]> {
    const limit = Math.min(args.limit ?? 50, 200);

    const emailFilters = [];
    if (args.entityType)
      emailFilters.push(eq(emailThreads.entityType, args.entityType));
    if (args.entityId)
      emailFilters.push(eq(emailThreads.entityId, args.entityId));

    const callFilters = [];
    if (args.entityType)
      callFilters.push(eq(callRecords.entityType, args.entityType));
    if (args.entityId)
      callFilters.push(eq(callRecords.entityId, args.entityId));

    const [emails, calls] = await Promise.all([
      db
        .select()
        .from(emailThreads)
        .where(emailFilters.length ? and(...emailFilters) : undefined)
        .orderBy(desc(emailThreads.sentAt), desc(emailThreads.createdAt))
        .limit(limit),
      db
        .select()
        .from(callRecords)
        .where(callFilters.length ? and(...callFilters) : undefined)
        .orderBy(desc(callRecords.occurredAt))
        .limit(limit),
    ]);

    const merged: CommunicationItem[] = [
      ...emails.map(toEmailItem),
      ...calls.map(toCallItem),
    ];
    merged.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
    return merged.slice(0, limit);
  },

  async listEmails(
    args: { limit?: number; entityType?: string; entityId?: string } = {},
  ): Promise<EmailThread[]> {
    const limit = Math.min(args.limit ?? 50, 200);
    const filters = [];
    if (args.entityType)
      filters.push(eq(emailThreads.entityType, args.entityType));
    if (args.entityId) filters.push(eq(emailThreads.entityId, args.entityId));
    return db
      .select()
      .from(emailThreads)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(emailThreads.sentAt), desc(emailThreads.createdAt))
      .limit(limit);
  },

  async listCalls(
    args: { limit?: number; entityType?: string; entityId?: string } = {},
  ): Promise<CallRecord[]> {
    const limit = Math.min(args.limit ?? 50, 200);
    const filters = [];
    if (args.entityType)
      filters.push(eq(callRecords.entityType, args.entityType));
    if (args.entityId) filters.push(eq(callRecords.entityId, args.entityId));
    return db
      .select()
      .from(callRecords)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(callRecords.occurredAt))
      .limit(limit);
  },

  async logEmail(
    input: EmailLogInput,
    opts: { actor: Actor },
  ): Promise<EmailThread> {
    const validated = emailLogSchema.parse(input);

    return db.transaction(async (tx) => {
      const row: NewEmailThread = {
        subject: validated.subject,
        fromEmail: validated.fromEmail,
        toEmails: validated.toEmails,
        ccEmails: validated.ccEmails,
        bccEmails: validated.bccEmails,
        direction: validated.direction,
        ...(validated.bodyPreview
          ? { bodyPreview: validated.bodyPreview }
          : {}),
        ...(validated.sentAt ? { sentAt: new Date(validated.sentAt) } : {}),
        ...(validated.entityType ? { entityType: validated.entityType } : {}),
        ...(validated.entityId ? { entityId: validated.entityId } : {}),
        ...(validated.gmailThreadId
          ? { gmailThreadId: validated.gmailThreadId }
          : {}),
      };
      const [inserted] = await tx.insert(emailThreads).values(row).returning();
      if (!inserted) throw new Error("Failed to log email");

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "email.logged",
          entityType: ENTITY_EMAIL,
          entityId: inserted.id,
          metadata: {
            direction: inserted.direction,
            subject: inserted.subject,
            entityType: inserted.entityType ?? null,
            entityId: inserted.entityId ?? null,
          },
        },
        tx,
      );

      return inserted;
    });
  },

  async logCall(
    input: CallLogInput,
    opts: { actor: Actor },
  ): Promise<CallRecord> {
    const validated = callLogSchema.parse(input);

    return db.transaction(async (tx) => {
      const row: NewCallRecord = {
        direction: validated.direction,
        ...(validated.fromNumber ? { fromNumber: validated.fromNumber } : {}),
        ...(validated.toNumber ? { toNumber: validated.toNumber } : {}),
        ...(validated.summary ? { summary: validated.summary } : {}),
        ...(validated.transcriptUrl
          ? { transcriptUrl: validated.transcriptUrl }
          : {}),
        ...(validated.recordingUrl
          ? { recordingUrl: validated.recordingUrl }
          : {}),
        ...(validated.outcome ? { outcome: validated.outcome } : {}),
        ...(validated.durationSeconds !== undefined
          ? { durationSeconds: validated.durationSeconds }
          : {}),
        ...(validated.occurredAt
          ? { occurredAt: new Date(validated.occurredAt) }
          : {}),
        ...(validated.entityType ? { entityType: validated.entityType } : {}),
        ...(validated.entityId ? { entityId: validated.entityId } : {}),
        ...(validated.provider ? { provider: validated.provider } : {}),
        ...(validated.providerCallId
          ? { providerCallId: validated.providerCallId }
          : {}),
      };
      const [inserted] = await tx.insert(callRecords).values(row).returning();
      if (!inserted) throw new Error("Failed to log call");

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "call.logged",
          entityType: ENTITY_CALL,
          entityId: inserted.id,
          metadata: {
            direction: inserted.direction,
            outcome: inserted.outcome ?? null,
            entityType: inserted.entityType ?? null,
            entityId: inserted.entityId ?? null,
          },
        },
        tx,
      );

      return inserted;
    });
  },

  async getEmail(id: string): Promise<EmailThread | null> {
    const [row] = await db
      .select()
      .from(emailThreads)
      .where(eq(emailThreads.id, id))
      .limit(1);
    return row ?? null;
  },

  async getCall(id: string): Promise<CallRecord | null> {
    const [row] = await db
      .select()
      .from(callRecords)
      .where(eq(callRecords.id, id))
      .limit(1);
    return row ?? null;
  },
};
