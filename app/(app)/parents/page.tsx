import type { Metadata } from "next";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = { title: "Parents" };

export default function ParentsPage() {
  return (
    <>
      <PageHeader
        title="Parents"
        description="Parent accounts and contact info."
      />
      <div className="p-6">
        <EmptyState
          title="Parents domain not implemented yet"
          description="Wire lib/services/parentService.ts following lib/services/leadService.ts."
        />
      </div>
    </>
  );
}
