import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";

import { CallLogForm } from "../CallLogForm";

export const metadata: Metadata = { title: "Log call" };
export const dynamic = "force-dynamic";

export default async function LogCallPage({
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
        title="Log call"
        description="Record a phone call. Voice provider integrations will populate this automatically."
      />
      <div className="p-6">
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Call</CardTitle>
          </CardHeader>
          <CardContent>
            <CallLogForm
              initial={{
                direction: "OUTBOUND",
                fromNumber: "",
                toNumber: "",
                outcome: "",
                durationMinutes: "",
                occurredAt: "",
                summary: "",
                transcriptUrl: "",
                recordingUrl: "",
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
