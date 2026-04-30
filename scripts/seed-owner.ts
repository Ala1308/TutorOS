/* eslint-disable no-console */
/**
 * Bootstrap (or re-link) the first OWNER user.
 *
 * Run:
 *   npm run seed:owner -- <email> "<full name>"
 *
 * The script is idempotent and rate-limit-tolerant:
 *   1. Looks up the auth.users row by email first.
 *   2. If absent, creates it via Supabase Admin API (using `createUser` which
 *      does NOT send email — avoids `over_email_send_rate_limit`).
 *   3. Upserts a public.users row with role=OWNER, linked by auth_user_id.
 *   4. Writes an audit log entry attributing the bootstrap to SYSTEM.
 *
 * Re-running with the same email just refreshes the link — safe to retry.
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { eq } from "drizzle-orm";

loadEnv({ path: ".env.local" });
loadEnv();

import { db } from "@/lib/db";
import { users, auditLog } from "@/lib/db/schema";

async function main() {
  const [email, ...nameParts] = process.argv.slice(2);
  const fullName = nameParts.join(" ");

  if (!email || !fullName) {
    console.error('Usage: npm run seed:owner -- <email> "<full name>"');
    process.exit(1);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
    process.exit(1);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Look up first — page through up to ~5k users (perPage max is 1000).
  console.log(`> Looking up auth user for ${email}...`);
  let authUserId: string | undefined;
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) {
      console.error("listUsers failed:", error);
      process.exit(1);
    }
    const match = data.users.find((u) => u.email === email);
    if (match) {
      authUserId = match.id;
      console.log(`  found existing auth user id=${authUserId}`);
      break;
    }
    if (data.users.length < 1000) break;
  }

  // 2. Create if missing — `createUser` doesn't send an email, so it
  // bypasses the email-send rate limit entirely.
  if (!authUserId) {
    console.log(
      "> Auth user not found — creating via admin.createUser (no email sent)...",
    );
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: "OWNER" },
    });
    if (error) {
      console.error("createUser failed:", error);
      process.exit(1);
    }
    authUserId = data.user?.id;
    if (!authUserId) {
      console.error("createUser returned no user id");
      process.exit(1);
    }
    console.log(`  created auth user id=${authUserId}`);
    console.log(
      "  Note: no magic-link email sent. Sign in via /login which calls signInWithOtp.",
    );
  }

  // 3. Upsert public.users row.
  console.log(`> Linking public.users row...`);
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  let userId: string;
  if (existing) {
    await db
      .update(users)
      .set({ authUserId, role: "OWNER", fullName, updatedAt: new Date() })
      .where(eq(users.id, existing.id));
    userId = existing.id;
    console.log(`  updated existing users row id=${userId}`);
  } else {
    const [inserted] = await db
      .insert(users)
      .values({ authUserId, email, fullName, role: "OWNER" })
      .returning();
    if (!inserted) {
      console.error("Failed to insert users row");
      process.exit(1);
    }
    userId = inserted.id;
    console.log(`  inserted users row id=${userId}`);
  }

  // 4. Audit
  await db.insert(auditLog).values({
    actorType: "SYSTEM",
    actorId: "seed-owner-script",
    action: "user.bootstrap.owner",
    entityType: "User",
    entityId: userId,
    metadata: { email, fullName, authUserId },
  });

  console.log("\n✓ Done.");
  console.log(
    "  Sign in at http://localhost:3000/login — request a magic link to this email.",
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
