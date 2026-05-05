import { randomUUID } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import {
  __resetMockVoiceCallsForTests,
  mockVoiceAdapter,
} from "@/lib/voice/mock";

const secret = process.env.VOICE_MOCK_WEBHOOK_SECRET ?? "";

describe("mockVoiceAdapter", () => {
  afterEach(() => {
    __resetMockVoiceCallsForTests();
  });

  it("createCall then getCall returns queued row", async () => {
    const { callId } = await mockVoiceAdapter.createCall({
      toPhone: "+15145550100",
      agentInstructions: "Be brief",
    });
    const row = await mockVoiceAdapter.getCall(callId);
    expect(row.status).toBe("queued");
    expect(row.providerCallId).toBe(`mock_${callId}`);
  });

  it("reject webhook when signature does not match secret", async () => {
    await expect(
      mockVoiceAdapter.handleWebhook(
        { event: "call.completed", callId: randomUUID() },
        "wrong-signature",
      ),
    ).rejects.toThrow(/signature/i);
  });

  it("call.completed updates status when signature matches", async () => {
    const { callId } = await mockVoiceAdapter.createCall({
      toPhone: "+15145550100",
      agentInstructions: "Hi",
    });

    const result = await mockVoiceAdapter.handleWebhook(
      {
        event: "call.completed",
        callId,
        durationSeconds: 42,
      },
      secret,
    );

    expect(result).toEqual({
      internalEvent: "call.completed",
      callId,
    });
    const row = await mockVoiceAdapter.getCall(callId);
    expect(row.status).toBe("completed");
    expect(row.durationSeconds).toBe(42);
  });

  it("call.transcript_ready stores transcript", async () => {
    const { callId } = await mockVoiceAdapter.createCall({
      toPhone: "+15145550100",
      agentInstructions: "Hi",
    });

    await mockVoiceAdapter.handleWebhook(
      {
        event: "call.transcript_ready",
        callId,
        transcript: "Hello from mock",
      },
      secret,
    );

    await expect(mockVoiceAdapter.getTranscript(callId)).resolves.toBe(
      "Hello from mock",
    );
  });

  it("unknown callId in webhook returns noop", async () => {
    const result = await mockVoiceAdapter.handleWebhook(
      {
        event: "call.completed",
        callId: randomUUID(),
      },
      secret,
    );
    expect(result).toEqual({ internalEvent: "noop" });
  });
});
