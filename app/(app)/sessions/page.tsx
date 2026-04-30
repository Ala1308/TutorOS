import type { Metadata } from "next";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = { title: "Sessions" };

export default function SessionsPage() {
  return (
    <>
      <PageHeader
        title="Sessions"
        description="Scheduled and past tutoring sessions."
      />
      <div className="p-6">
        <EmptyState
          title="Sessions domain not implemented yet"
          description="Schema is ready in lib/db/schema/sessions.ts. Wire calendar/Meet via lib/google."
        />
      </div>
    </>
  );
}
