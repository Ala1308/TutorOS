import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { studentService } from "@/lib/services/studentService";
import { tutorService } from "@/lib/services/tutorService";

import { HomeworkForm } from "../HomeworkForm";

export const metadata: Metadata = { title: "Assign homework" };
export const dynamic = "force-dynamic";

export default async function NewHomeworkPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireAuth([
    "OWNER",
    "ADMIN",
    "ACADEMIC_MANAGER",
    "TUTOR",
  ]);
  ensure(actor, "homework.create");

  const sp = await searchParams;
  const presetStudent = typeof sp.studentId === "string" ? sp.studentId : "";
  const presetSession = typeof sp.sessionId === "string" ? sp.sessionId : "";

  const [students, tutors] = await Promise.all([
    studentService.list({ limit: 200 }),
    tutorService.list({ limit: 200 }),
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
        title="Assign homework"
        description="Set what to do and when it's due."
      />
      <div className="p-6">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Homework</CardTitle>
          </CardHeader>
          <CardContent>
            {studentOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You need at least one student first.
              </p>
            ) : (
              <HomeworkForm
                mode="create"
                initial={{
                  studentId: presetStudent,
                  tutorId: "",
                  sessionId: presetSession,
                  title: "",
                  subject: "",
                  instructions: "",
                  dueDate: "",
                }}
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
