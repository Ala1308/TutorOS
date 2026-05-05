import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { integrations } from "@/lib/env";
import { googleTokenService } from "@/lib/services/googleTokenService";

import { disconnectGoogleAction } from "./actions";
import { DriveSmokeButton } from "./DriveSmokeButton";

export const metadata: Metadata = { title: "Google Workspace" };
export const dynamic = "force-dynamic";

const ERROR_COPY: Record<string, string> = {
  google_not_configured:
    "Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, and TOKEN_ENCRYPTION_KEY.",
  invalid_oauth:
    "That sign-in link was invalid or expired. Start the connection again.",
  user_not_found: "Your account could not be matched. Contact support.",
  access_denied: "You cancelled Google access. Nothing was saved.",
  oauth_callback_failed: "Something went wrong connecting Google. Try again.",
};

export default async function GoogleIntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    connected?: string;
    disconnected?: string;
    error?: string;
  }>;
}) {
  const actor = await requireAuth(["OWNER", "ADMIN"]);
  ensure(actor, "integration.google.link");

  const params = await searchParams;
  const summary = await googleTokenService.getSummary(actor.id);
  const configured = integrations.hasGoogleOAuth();

  const errorMsg = params.error
    ? (ERROR_COPY[params.error] ?? params.error.slice(0, 300))
    : null;

  return (
    <>
      <PageHeader
        title="Google Workspace"
        description="Connect your Google account for Drive (and later Gmail, Calendar)."
      />
      <div className="max-w-xl space-y-4 p-6">
        {params.connected === "1" ? (
          <p className="text-sm text-success">Google connected successfully.</p>
        ) : null}
        {params.disconnected === "1" ? (
          <p className="text-sm text-muted-foreground">Google disconnected.</p>
        ) : null}
        {errorMsg ? (
          <p role="alert" className="text-sm text-destructive">
            {errorMsg}
          </p>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Connection</CardTitle>
            <CardDescription>
              Tokens are encrypted at rest (AES-256-GCM). Only OWNER and ADMIN
              can link or disconnect.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {!configured ? (
              <p className="text-sm text-muted-foreground">
                OAuth env vars are incomplete — see{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  .env.example
                </code>
                .
              </p>
            ) : summary.connected ? (
              <>
                <dl className="grid gap-1 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className="font-medium text-success">Connected</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Access expires</dt>
                    <dd>{summary.expiresAt.toISOString()}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Scopes</dt>
                    <dd className="max-w-[240px] truncate text-right text-xs">
                      {summary.scope || "—"}
                    </dd>
                  </div>
                </dl>
                <form action={disconnectGoogleAction}>
                  <Button type="submit" variant="outline" size="sm">
                    Disconnect Google
                  </Button>
                </form>
                <div className="rounded-md border border-dashed p-3">
                  <p className="mb-2 text-xs text-muted-foreground">
                    Smoke test — runs the registered{" "}
                    <code className="rounded bg-muted px-1">
                      drive.createFolder
                    </code>{" "}
                    tool against your linked account (writes{" "}
                    <code className="rounded bg-muted px-1">drive_files</code> +
                    audit).
                  </p>
                  <DriveSmokeButton />
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Not linked. You&apos;ll be redirected to Google to approve
                  Drive file access (<code className="text-xs">drive.file</code>
                  ).
                </p>
                <Link
                  href="/api/google/oauth/start"
                  className={buttonVariants({ size: "sm" })}
                >
                  Connect Google
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
