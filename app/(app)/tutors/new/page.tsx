import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";

import { TutorForm } from "../TutorForm";

export const metadata: Metadata = { title: "New tutor" };

export default async function NewTutorPage() {
  const actor = await requireAuth(["OWNER", "ADMIN", "ACADEMIC_MANAGER"]);
  ensure(actor, "tutor.create");

  return (
    <>
      <PageHeader
        title="New tutor"
        description="Add a tutor applicant. Status starts at APPLIED."
      />
      <div className="p-6">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <TutorForm mode="create" />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
