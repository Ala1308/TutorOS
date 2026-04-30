import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";

import { NewLeadForm } from "./NewLeadForm";

export const metadata: Metadata = { title: "New lead" };

export default function NewLeadPage() {
  return (
    <>
      <PageHeader
        title="New lead"
        description="Capture an inbound inquiry. The lead.scoring agent will triage automatically."
      />
      <div className="p-6">
        <NewLeadForm />
      </div>
    </>
  );
}
