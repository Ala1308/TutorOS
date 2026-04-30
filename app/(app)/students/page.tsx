import type { Metadata } from "next";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = { title: "Students" };

export default function StudentsPage() {
  return (
    <>
      <PageHeader
        title="Students"
        description="Student profiles, plans, and history."
      />
      <div className="p-6">
        <EmptyState
          title="Students domain not implemented yet"
          description="Schema is ready in lib/db/schema/students.ts. Add a service + UI following the leads reference."
        />
      </div>
    </>
  );
}
