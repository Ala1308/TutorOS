export interface CreateCallInput {
  toPhone: string;
  fromPhone?: string;
  agentInstructions: string;
  metadata?: Record<string, unknown>;
}

export interface CreateCallResult {
  callId: string;
  providerCallId: string;
  status: "queued" | "in_progress" | "failed";
}

export interface CallRecord {
  callId: string;
  providerCallId: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  startedAt?: Date;
  endedAt?: Date;
  durationSeconds?: number;
  recordingUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface WebhookResult {
  internalEvent: "call.completed" | "call.transcript_ready" | "noop";
  callId?: string;
}

export interface VoiceProviderAdapter {
  name: string;
  createCall(input: CreateCallInput): Promise<CreateCallResult>;
  getCall(callId: string): Promise<CallRecord>;
  handleWebhook(payload: unknown, signature: string): Promise<WebhookResult>;
  getTranscript(callId: string): Promise<string | null>;
}
