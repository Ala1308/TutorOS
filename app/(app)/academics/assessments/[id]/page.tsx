import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { assessmentService } from "@/lib/services/assessmentService";
import { studentService } from "@/lib/services/studentService";
import { tutorService } from "@/lib/services/tutorService";
import { formatDateTime } from "@/lib/utils/dates";

import { AssessmentForm } from "../AssessmentForm";
import { DeleteAssessmentButton } from "./DeleteAssessmentButton";

export const metadata: Metadata = { title: "Assessment" };
export const dynamic = "force-dynamic";

export default async function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireAuth([
    "OWNER",
    "ADMIN",
    "ACADEMIC_MANAGER",
    "TUTOR",
    "PARENT",
  ]);
  ensure(actor, "assessment.read");

  const { id } = await params;
  const a = await assessmentService.get(id);
  if (!a) notFound();

  const [student, tutors] = await Promise.all([
    studentService.get(a.studentId),
    tutorService.list({ limit: 200 }),
  ]);

  const canEdit =
    actor.role === "OWNER" ||
    actor.role === "ADMIN" ||
    actor.role === "ACADEMIC_MANAGER" ||
    actor.role === "TUTOR";
  const canDelete = actor.role === "OWNER" || actor.role === "ADMIN";

  const tutorOptions = tutors.map((t) => ({
    id: t.id,
    label: `${t.fullName} (${t.status})`,
  }));

  return (
    <>
      <PageHeader
        title={a.title}
        description={
          student
            ? `${student.firstName} ${student.lastName} · ${a.subject}`
            : a.subject
        }
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={a.type} />
            {canDelete ? <DeleteAssessmentButton assessmentId={a.id} /> : null}
          </div>
        }
      />
      <div className="grid gap-4 p-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Details</CardTitle>
            {student ? (
              <Link
                href={`/students/${student.id}`}
                className="text-xs text-muted-foreground hover:underline"
              >
                Open student
              </Link>
            ) : null}
          </CardHeader>
          <CardContent>
            {canEdit ? (
              <AssessmentForm
                mode="edit"
                assessmentId={a.id}
                initial={{
                  studentId: a.studentId,
                  tutorId: a.tutorId ?? "",
                  sessionId: a.sessionId ?? "",
                  type: a.type,
                  subject: a.subject,
                  title: a.title,
                  scoreNumerator:
                    a.scoreNumerator !== null ? String(a.scoreNumerator) : "",
                  scoreDenominator:
                    a.scoreDenominator !== null
                      ? String(a.scoreDenominator)
                      : "",
                  level: a.level ?? "",
                  observations: a.observations ?? "",
                  recommendations: a.recommendations ?? "",
                  skills: (a.skills ?? []).join(", "),
                }}
                tutorOptions={tutorOptions}
                lockStudent
              />
            ) : (
              <StaticView
                rows={[
                  ["Subject", a.subject],
                  [
                    "Score",
                    a.scoreNumerator !== null && a.scoreDenominator !== null
                      ? `${a.scoreNumerator} / ${a.scoreDenominator}`
                      : "—",
                  ],
                  ["Level", a.level ?? "—"],
                  ["Skills", (a.skills ?? []).join(", ") || "—"],
                  ["Observations", a.observations ?? "—"],
                  ["Recommendations", a.recommendations ?? "—"],
                ]}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Meta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Meta label="Created" value={formatDateTime(a.createdAt)} />
            <Meta label="Updated" value={formatDateTime(a.updatedAt)} />
            <Meta
              label="Session"
              value={
                a.sessionId ? (
                  <Link
                    href={`/sessions/${a.sessionId}`}
                    className="text-primary hover:underline"
                  >
                    Open session
                  </Link>
                ) : (
                  "—"
                )
              }
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StaticView({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="space-y-2 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="rounded-md border px-3 py-2">
          <dt className="text-xs text-muted-foreground">{k}</dt>
          <dd className="whitespace-pre-wrap">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
