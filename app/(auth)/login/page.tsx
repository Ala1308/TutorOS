import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

/**
 * Map Supabase / our-callback error codes to user-facing copy.
 * Everything not on this list falls back to a generic message — we never
 * leak raw provider error strings to the UI.
 */
const ERROR_COPY: Record<string, string> = {
  missing_code:
    "That sign-in link was missing the verification token. Request a new one below.",
  otp_expired:
    "That sign-in link expired. Request a fresh one below — they're valid for 1 hour.",
  invalid_link:
    "That sign-in link is no longer valid (already used or expired). Request a new one below.",
  callback_failed:
    "We hit a snag verifying your sign-in. Please try again in a moment.",
  access_denied: "That sign-in link was rejected. Request a new one below.",
  auth_error:
    "Authentication failed. Please request a fresh sign-in link below.",
};

function errorCopy(code: string | undefined, description: string | undefined) {
  if (!code) return null;
  return ERROR_COPY[code] ?? description ?? ERROR_COPY.auth_error;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    error?: string;
    error_description?: string;
  }>;
}) {
  const params = await searchParams;
  const errorMessage = errorCopy(params.error, params.error_description);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in to TutorOS</CardTitle>
          <CardDescription>
            We&apos;ll email you a one-time link. No passwords.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {errorMessage ? (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {errorMessage}
            </div>
          ) : null}
          <LoginForm {...(params.next ? { next: params.next } : {})} />
        </CardContent>
      </Card>
    </div>
  );
}
