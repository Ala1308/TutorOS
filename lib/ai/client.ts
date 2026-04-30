import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

import { integrations } from "@/lib/env";
import { ExternalServiceError } from "@/lib/utils/errors";

import type { ModelChoice } from "./types";

/**
 * Provider-agnostic LLM resolver. Vercel AI SDK's `generateObject` expects a
 * LanguageModel; this picks the right provider given a ModelChoice and falls
 * back gracefully if the requested provider isn't configured.
 *
 * Fallback order: requested → anthropic → openai → google.
 */
export function resolveModel(choice: ModelChoice): LanguageModel {
  const tryProvider = (
    p: ModelChoice["provider"],
    m: string,
  ): LanguageModel | null => {
    switch (p) {
      case "anthropic":
        return integrations.hasAnthropic() ? anthropic(m) : null;
      case "openai":
        return integrations.hasOpenAI() ? openai(m) : null;
      case "google":
        return integrations.hasGoogleGenAI() ? google(m) : null;
    }
  };

  const requested = tryProvider(choice.provider, choice.model);
  if (requested) return requested;

  // Fallback chain — keep models conservative + cheap to avoid runaway cost.
  const fallback =
    tryProvider("anthropic", "claude-sonnet-4-latest") ??
    tryProvider("openai", "gpt-4o-mini") ??
    tryProvider("google", "gemini-1.5-flash");

  if (!fallback) {
    throw new ExternalServiceError(
      "ai",
      "No LLM provider configured. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or GOOGLE_GENERATIVE_AI_API_KEY.",
    );
  }
  return fallback;
}
