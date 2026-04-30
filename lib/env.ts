import { z } from "zod";

/**
 * Single source of truth for environment variables.
 * Validated once at boot. Feature code must import `env` from here,
 * never read `process.env.X` directly.
 *
 * Optional integrations (AI providers, Google, Voice, Langfuse) degrade
 * gracefully when their keys are missing — UI shows an "unavailable" state
 * instead of crashing the app.
 */

const optional = (s: z.ZodString = z.string()) =>
  s.optional().or(z.literal(""));

const voiceProviderSchema = z.enum([
  "none",
  "vapi",
  "elevenlabs",
  "bland",
  "retell",
  "synthflow",
  "lindy",
]);

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Auth (Supabase)
  SUPABASE_URL: optional(z.string().url()),
  SUPABASE_ANON_KEY: optional(),
  SUPABASE_SERVICE_ROLE_KEY: optional(),
  NEXT_PUBLIC_SUPABASE_URL: optional(z.string().url()),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optional(),

  // AI providers (all optional — runAgent reports unavailable if none configured)
  ANTHROPIC_API_KEY: optional(),
  OPENAI_API_KEY: optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: optional(),

  // Observability
  LANGFUSE_PUBLIC_KEY: optional(),
  LANGFUSE_SECRET_KEY: optional(),
  LANGFUSE_BASE_URL: optional(z.string().url()),

  // Inngest
  INNGEST_EVENT_KEY: optional(),
  INNGEST_SIGNING_KEY: optional(),

  // Google
  GOOGLE_CLIENT_ID: optional(),
  GOOGLE_CLIENT_SECRET: optional(),
  GOOGLE_REDIRECT_URI: optional(z.string().url()),
  TOKEN_ENCRYPTION_KEY: optional(),

  // Email (Resend) — optional. When unset, sendEmail() no-ops gracefully.
  RESEND_API_KEY: optional(),
  RESEND_FROM_EMAIL: optional(z.string().email()),

  // Voice
  VOICE_PROVIDER: voiceProviderSchema.default("none"),
  VAPI_API_KEY: optional(),
  ELEVENLABS_API_KEY: optional(),
  BLAND_API_KEY: optional(),
  RETELL_API_KEY: optional(),
  SYNTHFLOW_API_KEY: optional(),
  LINDY_API_KEY: optional(),

  // Defaults
  DEFAULT_TIMEZONE: z.string().default("America/Montreal"),
  DEFAULT_CURRENCY: z.string().default("CAD"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error(
    "Invalid environment variables:",
    parsed.error.flatten().fieldErrors,
  );
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;

/** Cheap predicates so feature code doesn't have to know about env shape. */
export const integrations = {
  hasAnthropic: () => Boolean(env.ANTHROPIC_API_KEY),
  hasOpenAI: () => Boolean(env.OPENAI_API_KEY),
  hasGoogleGenAI: () => Boolean(env.GOOGLE_GENERATIVE_AI_API_KEY),
  hasAnyLLM: () =>
    Boolean(
      env.ANTHROPIC_API_KEY ||
      env.OPENAI_API_KEY ||
      env.GOOGLE_GENERATIVE_AI_API_KEY,
    ),
  hasLangfuse: () =>
    Boolean(env.LANGFUSE_PUBLIC_KEY && env.LANGFUSE_SECRET_KEY),
  hasGoogleOAuth: () =>
    Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  hasInngest: () => Boolean(env.INNGEST_EVENT_KEY && env.INNGEST_SIGNING_KEY),
  hasSupabase: () => Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY),
  hasResend: () => Boolean(env.RESEND_API_KEY && env.RESEND_FROM_EMAIL),
  voiceProvider: () => env.VOICE_PROVIDER,
};
