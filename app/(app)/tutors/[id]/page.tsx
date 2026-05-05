import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { tutorService } from "@/lib/services/tutorService";

import { TutorForm } from "../TutorForm";
import { DeleteTutorButton } from "./DeleteTutorButton";
import { TutorStatusSelect } from "./TutorStatusSelect";

export const metadata: Metadata = { title: "Tutor" };
export const dynamic = "force-dynamic";

export default async function TutorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireAuth(["OWNER", "ADMIN", "ACADEMIC_MANAGER"]);
  ensure(actor, "tutor.read");

  const { id } = await params;
  const tutor = await tutorService.get(id);
  if (!tutor) notFound();

  return (
    <>
      <PageHeader
        title={tutor.fullName}
        description={tutor.email}
        actions={
          actor.role === "OWNER" || actor.role === "ADMIN" ? (
            <DeleteTutorButton tutorId={tutor.id} />
          ) : null
        }
      />
      <div className="grid gap-4 p-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Profile</CardTitle>
            <StatusBadge status={tutor.status} />
          </CardHeader>
          <CardContent>
            <TutorForm
              mode="edit"
              tutorId={tutor.id}
              initial={{
                fullName: tutor.fullName,
                email: tutor.email,
                phone: tutor.phone ?? "",
                status: tutor.status,
                subjects: (tutor.subjects ?? []).join(", "),
                grades: (tutor.grades ?? []).join(", "),
                hourlyRateCents:
                  tutor.hourlyRateCents != null
                    ? String(tutor.hourlyRateCents)
                    : "",
                notes: tutor.notes ?? "",
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline status</CardTitle>
          </CardHeader>
          <CardContent>
            <TutorStatusSelect
              tutorId={tutor.id}
              initialStatus={tutor.status}
            />
            <p className="mt-3 text-xs text-muted-foreground">
              Status changes are audited. Move to ACTIVE only after the hiring
              decision is approved.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
