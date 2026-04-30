/**
 * Redact PII before sending to LLMs that don't need identifying details.
 * This is best-effort; do not rely on it for compliance — combine with
 * consent + access control.
 */

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/g;
const URL_RE = /\bhttps?:\/\/\S+/g;

export interface RedactOptions {
  email?: boolean;
  phone?: boolean;
  url?: boolean;
  custom?: Array<{ pattern: RegExp; replacement: string }>;
}

const defaults: Required<Omit<RedactOptions, "custom">> = {
  email: true,
  phone: true,
  url: false,
};

export function redact(input: string, opts: RedactOptions = {}): string {
  let out = input;
  const o = { ...defaults, ...opts };
  if (o.email) out = out.replace(EMAIL_RE, "[EMAIL]");
  if (o.phone) out = out.replace(PHONE_RE, "[PHONE]");
  if (o.url) out = out.replace(URL_RE, "[URL]");
  for (const c of opts.custom ?? []) {
    out = out.replace(c.pattern, c.replacement);
  }
  return out;
}

/** Wrap user-supplied content in delimiters before passing to an LLM. */
export function asUserInputBlock(content: string): string {
  return `<user_input>\n${content}\n</user_input>`;
}
