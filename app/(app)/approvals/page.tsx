import type { Metadata } from "next";

import { ApprovalCard } from "@/components/agents/ApprovalCard";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { approvalService } from "@/lib/services/approvalService";

export const metadata: Metadata = { title: "Approvals" };
export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const pending = await approvalService.listPending(50);
  return (
    <>
      <PageHeader
        title="Approvals"
        description="Pending decisions surfaced by agents and workflows."
      />
      <div className="space-y-3 p-6">
        {pending.length === 0 ? (
          <EmptyState
            title="No pending approvals"
            description="When agents propose external actions, they show up here."
          />
        ) : (
          pending.map((a) => <ApprovalCard key={a.id} approval={a} />)
        )}
      </div>
    </>
  );
}
