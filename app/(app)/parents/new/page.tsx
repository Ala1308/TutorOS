import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";

import { ParentForm } from "../ParentForm";

export const metadata: Metadata = { title: "New parent" };

export default async function NewParentPage() {
  const actor = await requireAuth(["OWNER", "ADMIN", "ACADEMIC_MANAGER"]);
  ensure(actor, "parent.create");

  return (
    <>
      <PageHeader title="New parent" description="Create a parent account." />
      <div className="p-6">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <ParentForm mode="create" />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
