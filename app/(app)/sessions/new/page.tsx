import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { studentService } from "@/lib/services/studentService";
import { tutorService } from "@/lib/services/tutorService";

import { SessionForm } from "../SessionForm";

export const metadata: Metadata = { title: "Schedule session" };
export const dynamic = "force-dynamic";

export default async function NewSessionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireAuth(["OWNER", "ADMIN", "ACADEMIC_MANAGER"]);
  ensure(actor, "session.create");

  const sp = await searchParams;
  const initial = {
    studentId: typeof sp.studentId === "string" ? sp.studentId : "",
    tutorId: typeof sp.tutorId === "string" ? sp.tutorId : "",
    subject: "",
    startTime: "",
    endTime: "",
    googleMeetUrl: "",
    notes: "",
  };

  const [students, tutors] = await Promise.all([
    studentService.list({ limit: 100 }),
    tutorService.list({ limit: 100 }),
  ]);

  const studentOptions = students.map((s) => ({
    id: s.id,
    label: `${s.firstName} ${s.lastName} · ${s.parentName}`,
  }));
  const tutorOptions = tutors.map((t) => ({
    id: t.id,
    label: `${t.fullName} (${t.status})`,
  }));

  return (
    <>
      <PageHeader
        title="Schedule session"
        description="Pick a student and a tutor, then set a window. Conflicts with the same tutor are rejected."
      />
      <div className="p-6">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Session</CardTitle>
          </CardHeader>
          <CardContent>
            {studentOptions.length === 0 || tutorOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You need at least one student and one tutor first.
              </p>
            ) : (
              <SessionForm
                mode="create"
                initial={initial}
                studentOptions={studentOptions}
                tutorOptions={tutorOptions}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
