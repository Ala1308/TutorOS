import { timingSafeEqual } from "node:crypto";

import { z } from "zod";

import { env } from "@/lib/env";
import { ForbiddenError, ValidationError } from "@/lib/utils/errors";
import { newId } from "@/lib/utils/ids";

import type {
  CallRecord,
  CreateCallInput,
  CreateCallResult,
  VoiceProviderAdapter,
  WebhookResult,
} from "./types";

type StoredCall = CallRecord & { transcript?: string | null };

const calls = new Map<string, StoredCall>();

const webhookBodySchema = z.discriminatedUnion("event", [
  z.object({
    event: z.literal("call.completed"),
    callId: z.string().uuid(),
    durationSeconds: z.number().nonnegative().optional(),
    recordingUrl: z.string().url().optional(),
  }),
  z.object({
    event: z.literal("call.transcript_ready"),
    callId: z.string().uuid(),
    transcript: z.string(),
  }),
]);

function verifyWebhookSignature(signature: string, secret: string) {
  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(secret, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new ForbiddenError("Invalid voice webhook signature");
  }
}

/**
 * In-memory voice provider for development and automated tests. Not suitable
 * for multi-instance production (no shared call store).
 *
 * Webhooks must send header `x-signature` equal to `VOICE_MOCK_WEBHOOK_SECRET`.
 */
export const mockVoiceAdapter: VoiceProviderAdapter = {
  name: "mock",

  async createCall(input: CreateCallInput): Promise<CreateCallResult> {
    const callId = newId();
    const providerCallId = `mock_${callId}`;
    calls.set(callId, {
      callId,
      providerCallId,
      status: "queued",
      metadata: { ...input.metadata, toPhone: input.toPhone },
    });
    return { callId, providerCallId, status: "queued" };
  },

  async getCall(callId: string): Promise<CallRecord> {
    const row = calls.get(callId);
    if (!row) {
      throw new ValidationError("Unknown call id");
    }
    return row;
  },

  async handleWebhook(
    payload: unknown,
    signature: string,
  ): Promise<WebhookResult> {
    const secret = env.VOICE_MOCK_WEBHOOK_SECRET?.trim();
    if (!secret || secret.length < 8) {
      throw new ForbiddenError("VOICE_MOCK_WEBHOOK_SECRET is not configured");
    }
    verifyWebhookSignature(signature, secret);

    const body = webhookBodySchema.safeParse(payload);
    if (!body.success) {
      throw new ValidationError("Invalid mock voice webhook payload");
    }

    const row = calls.get(body.data.callId);
    if (!row) {
      return { internalEvent: "noop" };
    }

    if (body.data.event === "call.completed") {
      row.status = "completed";
      row.endedAt = new Date();
      if (body.data.durationSeconds !== undefined) {
        row.durationSeconds = body.data.durationSeconds;
      }
      if (body.data.recordingUrl !== undefined) {
        row.recordingUrl = body.data.recordingUrl;
      }
      return { internalEvent: "call.completed", callId: row.callId };
    }

    row.transcript = body.data.transcript;
    return { internalEvent: "call.transcript_ready", callId: row.callId };
  },

  async getTranscript(callId: string): Promise<string | null> {
    return calls.get(callId)?.transcript ?? null;
  },
};

/** Test-only: clear in-memory calls between tests. */
export function __resetMockVoiceCallsForTests(): void {
  calls.clear();
}
