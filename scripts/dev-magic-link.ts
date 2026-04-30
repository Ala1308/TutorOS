/* eslint-disable no-console */
/**
 * Generate a magic-link URL for a user without sending email.
 *
 * Usage:
 *   npm run dev:magic-link -- user@example.com
 *   npm run dev:magic-link -- user@example.com /leads     # land on /leads after sign-in
 *
 * Use this when you've hit Supabase's built-in `over_email_send_rate_limit`
 * during dev. Requires SUPABASE_SERVICE_ROLE_KEY (already in .env.local).
 *
 * The user must already exist in auth.users (run `npm run seed:owner ...`
 * first if not). This script won't create users — it only mints a sign-in URL.
 *
 * Security: NEVER expose this in production. The script reads the service-
 * role key directly from env and is gated to local use.
 */
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv();

async function main() {
  const [email, nextPath = "/"] = process.argv.slice(2);
  if (!email) {
    console.error("Usage: npm run dev:magic-link -- <email> [next-path]");
    process.exit(1);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  if (!supabaseUrl || !serviceKey) {
    console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
    process.exit(1);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const redirectTo = `${appUrl}/auth/callback`;

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });

  if (error) {
    console.error("generateLink failed:", error);
    process.exit(1);
  }

  const props = data?.properties;
  const hashedToken = props?.hashed_token;
  const verificationType = props?.verification_type;
  if (!hashedToken || !verificationType) {
    console.error(
      "generateLink returned no hashed_token / verification_type",
      data,
    );
    process.exit(1);
  }

  // We DON'T want Supabase's /verify endpoint here — it redirects with an
  // implicit-flow hash fragment that the server can't read. Instead, send
  // the token_hash straight to our /auth/callback route, which calls
  // supabase.auth.verifyOtp({ token_hash, type }) server-side.
  const target = new URL(`${appUrl}/auth/callback`);
  target.searchParams.set("token_hash", hashedToken);
  target.searchParams.set("type", verificationType);
  if (nextPath && nextPath !== "/") target.searchParams.set("next", nextPath);
  const actionLink = target.toString();

  console.log("\n✓ Magic link generated. Paste this into your browser:\n");
  console.log(actionLink);
  console.log("\n  (One-time use. Expires per your project's OTP TTL.)");

  // Best-effort: copy to macOS pasteboard so the user can just hit Cmd+V.
  if (process.platform === "darwin") {
    try {
      const { spawn } = await import("node:child_process");
      const pbcopy = spawn("pbcopy");
      pbcopy.stdin.write(actionLink);
      pbcopy.stdin.end();
      await new Promise<void>((resolve) => pbcopy.on("close", () => resolve()));
      console.log("  ✓ Copied to clipboard.\n");
    } catch {
      console.log();
    }
  } else {
    console.log();
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
