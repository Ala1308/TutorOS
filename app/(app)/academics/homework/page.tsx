import Link from "next/link";
import type { Metadata } from "next";

import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import {
  homeworkService,
  type HomeworkWithRefs,
} from "@/lib/services/homeworkService";
import { formatDay } from "@/lib/utils/dates";

export const metadata: Metadata = { title: "Homework" };
export const dynamic = "force-dynamic";

const columns: Column<HomeworkWithRefs>[] = [
  {
    key: "title",
    header: "Title",
    cell: (h) => (
      <Link
        href={`/academics/homework/${h.id}`}
        className="font-medium hover:underline"
      >
        {h.title}
      </Link>
    ),
  },
  {
    key: "student",
    header: "Student",
    cell: (h) => (
      <Link
        href={`/students/${h.studentId}`}
        className="text-muted-foreground hover:underline"
      >
        {h.studentFirstName} {h.studentLastName}
      </Link>
    ),
  },
  {
    key: "subject",
    header: "Subject",
    cell: (h) => (
      <span className="text-muted-foreground">{h.subject ?? "—"}</span>
    ),
  },
  {
    key: "due",
    header: "Due",
    cell: (h) => (
      <span className="text-xs text-muted-foreground">
        {h.dueDate ? formatDay(h.dueDate) : "—"}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (h) => <StatusBadge status={h.status} />,
  },
  {
    key: "tutor",
    header: "Tutor",
    cell: (h) => (
      <span className="text-muted-foreground">{h.tutorFullName ?? "—"}</span>
    ),
  },
];

export default async function HomeworkPage({
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
  ensure(actor, "homework.read");

  const sp = await searchParams;
  const openOnly = sp.scope === "open";

  const rows = await homeworkService.list({ limit: 100, openOnly });

  const canCreate =
    actor.role === "OWNER" ||
    actor.role === "ADMIN" ||
    actor.role === "ACADEMIC_MANAGER" ||
    actor.role === "TUTOR";

  return (
    <>
      <PageHeader
        title="Homework"
        description="Assignments tied to a student. Tracks due date and review status."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/academics/homework${openOnly ? "" : "?scope=open"}`}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              {openOnly ? "Show all" : "Open only"}
            </Link>
            {canCreate ? (
              <Link href="/academics/homework/new">
                <Button size="sm">Assign</Button>
              </Link>
            ) : null}
          </div>
        }
      />
      <div className="p-6">
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(h) => h.id}
          emptyTitle={openOnly ? "No open homework" : "No homework yet"}
          emptyDescription="Assign one after a session to keep momentum."
        />
      </div>
    </>
  );
}
