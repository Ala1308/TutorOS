import { env } from "@/lib/env";

import { mockVoiceAdapter } from "./mock";
import { noneAdapter } from "./none";

import type { VoiceProviderAdapter } from "./types";

/**
 * Returns the active voice provider. Add a provider:
 *   1. Create lib/voice/<provider>.ts implementing VoiceProviderAdapter.
 *   2. Switch on it here.
 *   3. Add its API key to env.ts.
 *   4. Add `app/api/voice/<provider>/webhook/route.ts` for inbound events.
 */
export function getVoiceProvider(): VoiceProviderAdapter {
  switch (env.VOICE_PROVIDER) {
    case "none":
      return noneAdapter;
    case "mock":
      return mockVoiceAdapter;
    case "vapi":
    case "elevenlabs":
    case "bland":
    case "retell":
    case "synthflow":
    case "lindy":
      // Real adapters are not implemented yet — fall through to none so the
      // rest of the app keeps working.
      return noneAdapter;
    default:
      return noneAdapter;
  }
}

export type { VoiceProviderAdapter } from "./types";
