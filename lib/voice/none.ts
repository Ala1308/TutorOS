import { ExternalServiceError } from "@/lib/utils/errors";

import type { VoiceProviderAdapter } from "./types";

/**
 * No-op provider. UI shows "voice provider not configured"; manual flows
 * keep working unchanged.
 */
export const noneAdapter: VoiceProviderAdapter = {
  name: "none",
  async createCall() {
    throw new ExternalServiceError("voice", "voice_provider_not_configured");
  },
  async getCall() {
    throw new ExternalServiceError("voice", "voice_provider_not_configured");
  },
  async handleWebhook() {
    return { internalEvent: "noop" };
  },
  async getTranscript() {
    return null;
  },
};
