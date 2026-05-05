import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { homeworkService } from "@/lib/services/homeworkService";
import { studentService } from "@/lib/services/studentService";
import { tutorService } from "@/lib/services/tutorService";
import { formatDateTime } from "@/lib/utils/dates";

import { HomeworkForm } from "../HomeworkForm";
import { DeleteHomeworkButton } from "./DeleteHomeworkButton";
import { HomeworkStatusActions } from "./HomeworkStatusActions";

export const metadata: Metadata = { title: "Homework" };
export const dynamic = "force-dynamic";

export default async function HomeworkDetailPage({
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
  ensure(actor, "homework.read");

  const { id } = await params;
  const h = await homeworkService.get(id);
  if (!h) notFound();

  const [student, tutors] = await Promise.all([
    studentService.get(h.studentId),
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
        title={h.title}
        description={
          student
            ? `${student.firstName} ${student.lastName}${h.subject ? ` · ${h.subject}` : ""}`
            : (h.subject ?? "")
        }
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={h.status} />
            {canDelete ? <DeleteHomeworkButton homeworkId={h.id} /> : null}
          </div>
        }
      />
      <div className="grid gap-4 p-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Details</CardTitle>
            {h.dueDate ? (
              <span className="text-xs text-muted-foreground">
                Due {formatDateTime(h.dueDate)}
              </span>
            ) : null}
          </CardHeader>
          <CardContent>
            {canEdit ? (
              <HomeworkForm
                mode="edit"
                homeworkId={h.id}
                initial={{
                  studentId: h.studentId,
                  tutorId: h.tutorId ?? "",
                  sessionId: h.sessionId ?? "",
                  title: h.title,
                  subject: h.subject ?? "",
                  instructions: h.instructions ?? "",
                  dueDate: h.dueDate ? h.dueDate.toISOString() : "",
                }}
                tutorOptions={tutorOptions}
                lockStudent
              />
            ) : (
              <dl className="space-y-2 text-sm">
                <Row label="Subject" value={h.subject ?? "—"} />
                <Row
                  label="Due"
                  value={h.dueDate ? formatDateTime(h.dueDate) : "—"}
                />
                <Row label="Instructions" value={h.instructions ?? "—"} />
                <Row label="Submission URL" value={h.submissionUrl ?? "—"} />
                <Row
                  label="Submission notes"
                  value={h.submissionNotes ?? "—"}
                />
                <Row label="Grade" value={h.grade ?? "—"} />
                <Row
                  label="Score"
                  value={h.scorePercent != null ? `${h.scorePercent}%` : "—"}
                />
                <Row label="Feedback" value={h.feedback ?? "—"} />
              </dl>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            <HomeworkStatusActions
              homeworkId={h.id}
              currentStatus={h.status}
              role={actor.role}
            />
            {h.sessionId ? (
              <p className="mt-4 text-xs text-muted-foreground">
                From{" "}
                <Link
                  href={`/sessions/${h.sessionId}`}
                  className="text-primary hover:underline"
                >
                  this session
                </Link>
                .
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-wrap">{value}</dd>
    </div>
  );
}
