import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { Database } from "@/lib/db/supabase-types";
import { env, integrations } from "@/lib/env";
import { logger } from "@/lib/logger";
import { ForbiddenError, UnauthorizedError } from "@/lib/utils/errors";

import type { Actor, UserRole } from "./types";

/**
 * Server-side Supabase client. Reads/writes session cookies via Next's
 * cookies() helper. Use only in Server Components, Server Actions, and
 * Route Handlers.
 */
export async function getServerClient() {
  if (!integrations.hasSupabase()) {
    throw new UnauthorizedError(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.",
    );
  }
  const cookieStore = await cookies();
  return createServerClient<Database>(
    env.SUPABASE_URL!,
    env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options: CookieOptions;
          }>,
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll called from a Server Component; ignore (handled by middleware in the future).
          }
        },
      },
    },
  );
}

/**
 * Loads the current user from Supabase auth and joins the local `users` row.
 * Returns null if no authenticated session.
 */
export async function getCurrentUser(): Promise<Actor | null> {
  if (!integrations.hasSupabase()) return null;

  try {
    const supabase = await getServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.authUserId, user.id))
      .limit(1);

    if (!row) {
      logger.warn(
        { authUserId: user.id, email: user.email },
        "Authenticated Supabase user has no corresponding users row",
      );
      return null;
    }

    return {
      type: "USER",
      id: row.id,
      role: row.role,
      email: row.email,
    };
  } catch (err) {
    logger.error({ err }, "getCurrentUser failed");
    return null;
  }
}

/**
 * Throws UnauthorizedError if not signed in, ForbiddenError if not in
 * `allowedRoles`. Returns the Actor on success.
 */
export async function requireAuth(
  allowedRoles?: UserRole[],
): Promise<Actor & { type: "USER" }> {
  const actor = await getCurrentUser();
  if (!actor) throw new UnauthorizedError();
  if (actor.type !== "USER") {
    throw new ForbiddenError("Non-user actors cannot access UI");
  }
  if (
    allowedRoles &&
    allowedRoles.length > 0 &&
    !allowedRoles.includes(actor.role)
  ) {
    throw new ForbiddenError(`Role ${actor.role} cannot perform this action`);
  }
  return actor;
}
