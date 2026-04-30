import "server-only";

import { Resend } from "resend";

import { env, integrations } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Transactional email sender (Resend).
 *
 * Use this for app-level emails (booking confirmations, reminders, admin
 * notifications). NOT for Supabase auth emails — those go through the SMTP
 * settings configured in the Supabase dashboard.
 *
 * Optional integration: when RESEND_API_KEY / RESEND_FROM_EMAIL are unset,
 * sendEmail() logs a warning and resolves with `{ skipped: true }` in dev,
 * and throws in production. This matches the "graceful degradation" pattern
 * used by other optional integrations (Anthropic, Google, etc.).
 */

let cachedClient: Resend | null = null;

function getClient(): Resend | null {
  if (!integrations.hasResend()) return null;
  if (cachedClient) return cachedClient;
  cachedClient = new Resend(env.RESEND_API_KEY!);
  return cachedClient;
}

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  /** HTML body. Provide either `html` or `text` (or both for best deliverability). */
  html?: string;
  text?: string;
  /** Override the default From address (RESEND_FROM_EMAIL). */
  from?: string;
  /** Optional reply-to address (e.g. support@yourdomain.com). */
  replyTo?: string | string[];
  /** Tags forwarded to Resend for analytics/filtering in their dashboard. */
  tags?: Array<{ name: string; value: string }>;
};

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped?: false; error: string };

export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const client = getClient();
  const recipients = Array.isArray(input.to) ? input.to : [input.to];
  const tagsForLog = { to: recipients, subject: input.subject };

  if (!client) {
    if (env.NODE_ENV === "production") {
      logger.error(tagsForLog, "sendEmail called but Resend is not configured");
      throw new Error(
        "Resend is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.",
      );
    }
    logger.warn(
      tagsForLog,
      "sendEmail skipped — RESEND_API_KEY/RESEND_FROM_EMAIL missing (dev)",
    );
    return { ok: false, skipped: true, reason: "resend_not_configured" };
  }

  if (!input.html && !input.text) {
    return {
      ok: false,
      error: "sendEmail requires at least one of `html` or `text`",
    };
  }

  const from = input.from ?? env.RESEND_FROM_EMAIL!;
  const start = Date.now();

  // Build the html-or-text payload variant explicitly. We pass through to
  // Resend's content-shape union (never the `template` variant), so we
  // assemble the object to match that branch and avoid TS union narrowing
  // friction caused by exactOptionalPropertyTypes.
  type ResendSendArgs = Parameters<typeof client.emails.send>[0];
  const payload = {
    from,
    to: recipients,
    subject: input.subject,
    html: input.html,
    text: input.text,
    ...(input.replyTo !== undefined ? { replyTo: input.replyTo } : {}),
    ...(input.tags !== undefined ? { tags: input.tags } : {}),
  } as ResendSendArgs;

  try {
    const { data, error } = await client.emails.send(payload);

    const elapsedMs = Date.now() - start;

    if (error) {
      logger.warn(
        { ...tagsForLog, elapsedMs, error: error.message, name: error.name },
        "sendEmail: Resend returned an error",
      );
      return { ok: false, error: error.message };
    }

    if (!data?.id) {
      logger.warn(
        { ...tagsForLog, elapsedMs },
        "sendEmail: Resend returned no id",
      );
      return { ok: false, error: "missing_id" };
    }

    logger.info(
      { ...tagsForLog, elapsedMs, id: data.id, from },
      "sendEmail: delivered to Resend",
    );
    return { ok: true, id: data.id };
  } catch (err) {
    const elapsedMs = Date.now() - start;
    logger.error(
      { ...tagsForLog, elapsedMs, err },
      "sendEmail: unexpected exception",
    );
    return {
      ok: false,
      error: err instanceof Error ? err.message : "unknown_error",
    };
  }
}
