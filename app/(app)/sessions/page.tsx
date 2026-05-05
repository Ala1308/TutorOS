import Link from "next/link";
import type { Metadata } from "next";

import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import {
  sessionService,
  type SessionWithPeople,
} from "@/lib/services/sessionService";
import { formatDateTime } from "@/lib/utils/dates";

export const metadata: Metadata = { title: "Sessions" };
export const dynamic = "force-dynamic";

const columns: Column<SessionWithPeople>[] = [
  {
    key: "when",
    header: "When",
    cell: (s) => (
      <Link href={`/sessions/${s.id}`} className="font-medium hover:underline">
        {formatDateTime(s.startTime)}
      </Link>
    ),
  },
  {
    key: "student",
    header: "Student",
    cell: (s) => (
      <Link
        href={`/students/${s.studentId}`}
        className="text-muted-foreground hover:underline"
      >
        {s.studentFirstName} {s.studentLastName}
      </Link>
    ),
  },
  {
    key: "tutor",
    header: "Tutor",
    cell: (s) => (
      <Link
        href={`/tutors/${s.tutorId}`}
        className="text-muted-foreground hover:underline"
      >
        {s.tutorFullName}
      </Link>
    ),
  },
  {
    key: "subject",
    header: "Subject",
    cell: (s) => <span className="text-muted-foreground">{s.subject}</span>,
  },
  {
    key: "duration",
    header: "Duration",
    cell: (s) => (
      <span className="text-muted-foreground">{s.durationMinutes} min</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (s) => <StatusBadge status={s.status} />,
  },
];

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireAuth([
    "OWNER",
    "ADMIN",
    "ACADEMIC_MANAGER",
    "TUTOR",
    "PARENT",
  ]);
  ensure(actor, "session.read");

  const sp = await searchParams;
  const upcomingOnly = sp.scope === "upcoming";

  const rows = await sessionService.list({
    upcomingOnly,
    limit: 100,
  });

  const canCreate =
    actor.role === "OWNER" ||
    actor.role === "ADMIN" ||
    actor.role === "ACADEMIC_MANAGER";

  return (
    <>
      <PageHeader
        title="Sessions"
        description="Tutoring sessions. Times shown in your default timezone."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/sessions${upcomingOnly ? "" : "?scope=upcoming"}`}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              {upcomingOnly ? "Show all" : "Upcoming only"}
            </Link>
            {canCreate ? (
              <Link href="/sessions/new">
                <Button size="sm">Schedule</Button>
              </Link>
            ) : null}
          </div>
        }
      />
      <div className="p-6">
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(s) => s.id}
          emptyTitle={upcomingOnly ? "No upcoming sessions" : "No sessions yet"}
          emptyDescription="Schedule one to get started."
        />
      </div>
    </>
  );
}
