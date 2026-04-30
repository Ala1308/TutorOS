/* eslint-disable no-console */
/**
 * Smoke-test the Resend integration.
 *
 * Usage:
 *   npm run dev:test-email -- a.e.mebarkia@gmail.com
 *   npm run dev:test-email -- a.e.mebarkia@gmail.com "Custom subject"
 *
 * Reads RESEND_API_KEY and RESEND_FROM_EMAIL from .env.local. Sends a
 * "Hello World" email via Resend and prints the resulting message id.
 *
 * NOTE: when using `onboarding@resend.dev` as the From address (default in
 * .env.example), Resend will only deliver to the email you used to sign up
 * for your Resend account. To send anywhere, verify a domain in the
 * Resend dashboard and switch RESEND_FROM_EMAIL to noreply@yourdomain.com.
 */
import { Resend } from "resend";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv();

async function main() {
  const [to, subject = "Hello World from TutorOS"] = process.argv.slice(2);
  if (!to) {
    console.error("Usage: npm run dev:test-email -- <to-email> [subject]");
    process.exit(1);
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    console.error(
      "RESEND_API_KEY and RESEND_FROM_EMAIL must be set in .env.local",
    );
    process.exit(1);
  }

  const resend = new Resend(apiKey);

  console.log(`> Sending test email`);
  console.log(`  from:    ${from}`);
  console.log(`  to:      ${to}`);
  console.log(`  subject: ${subject}\n`);

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html: `
      <div style="font-family: -apple-system, system-ui, sans-serif;">
        <h1 style="color: #111;">It works.</h1>
        <p>Congrats on sending your <strong>first email</strong> from TutorOS via Resend.</p>
        <p style="color: #666; font-size: 12px;">
          Sent ${new Date().toISOString()} by scripts/test-email.ts
        </p>
      </div>
    `,
    text: "It works. Congrats on sending your first email from TutorOS via Resend.",
  });

  if (error) {
    console.error("✗ Resend returned an error:", error);
    process.exit(1);
  }

  console.log(`✓ Sent. Resend message id: ${data?.id}\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
