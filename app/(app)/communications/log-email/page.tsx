import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";

import { EmailLogForm } from "../EmailLogForm";

export const metadata: Metadata = { title: "Log email" };
export const dynamic = "force-dynamic";

export default async function LogEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireAuth(["OWNER", "ADMIN", "ACADEMIC_MANAGER"]);
  ensure(actor, "comm.log");

  const sp = await searchParams;
  const presetEntityType =
    typeof sp.entityType === "string" ? sp.entityType : "";
  const presetEntityId = typeof sp.entityId === "string" ? sp.entityId : "";

  return (
    <>
      <PageHeader
        title="Log email"
        description="Record an email you sent or received outside the in-app integration."
      />
      <div className="p-6">
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Email</CardTitle>
          </CardHeader>
          <CardContent>
            <EmailLogForm
              initial={{
                direction: "OUTBOUND",
                subject: "",
                fromEmail: "",
                toEmails: "",
                ccEmails: "",
                bccEmails: "",
                bodyPreview: "",
                sentAt: "",
                entityType: presetEntityType,
                entityId: presetEntityId,
              }}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
