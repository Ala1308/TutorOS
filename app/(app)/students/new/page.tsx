import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { parentService } from "@/lib/services/parentService";

import { StudentForm } from "../StudentForm";

export const metadata: Metadata = { title: "New student" };
export const dynamic = "force-dynamic";

export default async function NewStudentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireAuth(["OWNER", "ADMIN", "ACADEMIC_MANAGER"]);
  ensure(actor, "student.create");

  const sp = await searchParams;
  const initialParentId =
    typeof sp.parentId === "string" ? sp.parentId : undefined;

  const parents = (await parentService.list({ limit: 100 })).map((p) => ({
    id: p.id,
    fullName: p.fullName,
    email: p.email,
  }));

  return (
    <>
      <PageHeader
        title="New student"
        description="Link a student to an existing parent account."
      />
      <div className="p-6">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            {parents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Create a parent first, then return here.
              </p>
            ) : (
              <StudentForm
                mode="create"
                parents={parents}
                {...(initialParentId
                  ? { initialParentId: initialParentId }
                  : {})}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
