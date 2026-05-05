import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { studentService } from "@/lib/services/studentService";
import { tutorService } from "@/lib/services/tutorService";

import { AssessmentForm } from "../AssessmentForm";

export const metadata: Metadata = { title: "New assessment" };
export const dynamic = "force-dynamic";

export default async function NewAssessmentPage({
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
  ensure(actor, "assessment.create");

  const sp = await searchParams;
  const presetStudent = typeof sp.studentId === "string" ? sp.studentId : "";

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
        title="New assessment"
        description="Capture a structured evaluation. Use diagnostic for first contact, progress for ongoing work."
      />
      <div className="p-6">
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            {studentOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You need at least one student first.
              </p>
            ) : (
              <AssessmentForm
                mode="create"
                initial={{
                  studentId: presetStudent,
                  tutorId: "",
                  sessionId: "",
                  type: "PROGRESS",
                  subject: "",
                  title: "",
                  scoreNumerator: "",
                  scoreDenominator: "",
                  level: "",
                  observations: "",
                  recommendations: "",
                  skills: "",
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
