import type { Metadata } from "next";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = { title: "Tutors" };

export default function TutorsPage() {
  return (
    <>
      <PageHeader
        title="Tutors"
        description="Tutors, applications, and assignments."
      />
      <div className="p-6">
        <EmptyState
          title="Tutors domain not implemented yet"
          description="Schema is ready. Add lib/services/tutorService.ts following leadService."
        />
      </div>
    </>
  );
}
