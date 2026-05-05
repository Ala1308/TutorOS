import Link from "next/link";
import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { commsService } from "@/lib/services/commsService";

import { CommunicationsFeed } from "./CommunicationsFeed";

export const metadata: Metadata = { title: "Communications" };
export const dynamic = "force-dynamic";

export default async function CommunicationsPage() {
  const actor = await requireAuth(["OWNER", "ADMIN", "ACADEMIC_MANAGER"]);
  ensure(actor, "comm.read");

  const items = await commsService.list({ limit: 100 });

  return (
    <>
      <PageHeader
        title="Communications"
        description="Unified log of emails and calls. Linked to a lead, parent, student, tutor, or session when set."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/communications/log-email">
              <Button size="sm" variant="secondary">
                Log email
              </Button>
            </Link>
            <Link href="/communications/log-call">
              <Button size="sm">Log call</Button>
            </Link>
          </div>
        }
      />
      <div className="p-6">
        <CommunicationsFeed items={items} />
      </div>
    </>
  );
}
