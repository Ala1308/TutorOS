"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getServerClient } from "@/lib/auth/supabase";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const signInSchema = z.object({
  email: z.string().email(),
  next: z.string().optional(),
});

export type SignInResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export async function signInAction(formData: FormData): Promise<SignInResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, message: "Please enter a valid email." };
  }

  try {
    const supabase = await getServerClient();
    const redirectTo = `${env.NEXT_PUBLIC_APP_URL}/auth/callback${
      parsed.data.next ? `?next=${encodeURIComponent(parsed.data.next)}` : ""
    }`;
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
    });
    if (error) {
      logger.warn(
        { code: error.code, status: error.status },
        "signInWithOtp failed",
      );
      // Mask "user not found" / specific failures to avoid email enumeration.
      if (error.code === "over_email_send_rate_limit") {
        return {
          ok: false,
          message:
            "Email rate limit reached. Try again in a minute, or check your inbox for a recent link.",
        };
      }
      return {
        ok: false,
        message: "If that account exists, a link is on its way.",
      };
    }
    return {
      ok: true,
      message: "Check your inbox for a one-time sign-in link.",
    };
  } catch (err) {
    logger.error({ err }, "signInAction unexpected error");
    return { ok: false, message: "Something went wrong. Try again." };
  }
}

export async function signOutAction() {
  const supabase = await getServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
