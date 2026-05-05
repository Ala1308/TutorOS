import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { sessionService } from "@/lib/services/sessionService";
import { studentService } from "@/lib/services/studentService";
import { tutorService } from "@/lib/services/tutorService";
import { formatDateTime } from "@/lib/utils/dates";

import { SessionForm } from "../SessionForm";
import { BillSessionButton } from "./BillSessionButton";
import { DeleteSessionButton } from "./DeleteSessionButton";
import { SessionStatusActions } from "./SessionStatusActions";

export const metadata: Metadata = { title: "Session" };
export const dynamic = "force-dynamic";

export default async function SessionDetailPage({
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
  ensure(actor, "session.read");

  const { id } = await params;
  const session = await sessionService.get(id);
  if (!session) notFound();

  const [student, tutor, allTutors] = await Promise.all([
    studentService.get(session.studentId),
    tutorService.get(session.tutorId),
    tutorService.list({ limit: 100 }),
  ]);

  const canEdit =
    actor.role === "OWNER" ||
    actor.role === "ADMIN" ||
    actor.role === "ACADEMIC_MANAGER";

  return (
    <>
      <PageHeader
        title={`Session · ${formatDateTime(session.startTime)}`}
        description={
          student && tutor
            ? `${student.firstName} ${student.lastName} with ${tutor.fullName} · ${session.subject}`
            : session.subject
        }
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={session.status} />
            {actor.role === "OWNER" || actor.role === "ADMIN" ? (
              <DeleteSessionButton sessionId={session.id} />
            ) : null}
          </div>
        }
      />
      <div className="grid gap-4 p-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Details</CardTitle>
            {session.googleMeetUrl ? (
              <Link
                href={session.googleMeetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary underline-offset-2 hover:underline"
              >
                Join Meet
              </Link>
            ) : null}
          </CardHeader>
          <CardContent>
            {canEdit ? (
              <SessionForm
                mode="edit"
                sessionId={session.id}
                initial={{
                  studentId: session.studentId,
                  tutorId: session.tutorId,
                  subject: session.subject,
                  startTime: session.startTime.toISOString(),
                  endTime: session.endTime.toISOString(),
                  googleMeetUrl: session.googleMeetUrl ?? "",
                  notes: session.notes ?? "",
                }}
                tutorOptions={allTutors.map((t) => ({
                  id: t.id,
                  label: `${t.fullName} (${t.status})`,
                }))}
              />
            ) : (
              <dl className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                <Static label="Subject" value={session.subject} />
                <Static
                  label="Duration"
                  value={`${session.durationMinutes} min`}
                />
                <Static
                  label="Start"
                  value={formatDateTime(session.startTime)}
                />
                <Static label="End" value={formatDateTime(session.endTime)} />
                <Static
                  label="Notes"
                  value={session.notes ?? "—"}
                  className="md:col-span-2"
                />
              </dl>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SessionStatusActions
              sessionId={session.id}
              currentStatus={session.status}
              role={actor.role}
            />
            {canEdit ? (
              <div className="flex flex-col gap-2 border-t pt-3 text-xs">
                <Link
                  href={`/academics/homework/new?studentId=${session.studentId}&sessionId=${session.id}`}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  + Assign homework
                </Link>
                <Link
                  href={`/academics/assessments/new?studentId=${session.studentId}`}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  + Write assessment
                </Link>
                <div className="pt-1">
                  <BillSessionButton sessionId={session.id} />
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Static({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`rounded-md border px-3 py-2 ${className ?? ""}`}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
