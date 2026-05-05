import Link from "next/link";
import type { Metadata } from "next";

import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import {
  assessmentService,
  type AssessmentWithRefs,
} from "@/lib/services/assessmentService";
import { formatDay } from "@/lib/utils/dates";

export const metadata: Metadata = { title: "Assessments" };
export const dynamic = "force-dynamic";

const columns: Column<AssessmentWithRefs>[] = [
  {
    key: "title",
    header: "Title",
    cell: (a) => (
      <Link
        href={`/academics/assessments/${a.id}`}
        className="font-medium hover:underline"
      >
        {a.title}
      </Link>
    ),
  },
  {
    key: "student",
    header: "Student",
    cell: (a) => (
      <Link
        href={`/students/${a.studentId}`}
        className="text-muted-foreground hover:underline"
      >
        {a.studentFirstName} {a.studentLastName}
      </Link>
    ),
  },
  {
    key: "type",
    header: "Type",
    cell: (a) => <StatusBadge status={a.type} />,
  },
  {
    key: "subject",
    header: "Subject",
    cell: (a) => <span className="text-muted-foreground">{a.subject}</span>,
  },
  {
    key: "score",
    header: "Score",
    cell: (a) =>
      a.scoreNumerator !== null && a.scoreDenominator !== null ? (
        <span className="font-mono text-xs">
          {a.scoreNumerator}/{a.scoreDenominator}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "tutor",
    header: "Tutor",
    cell: (a) => (
      <span className="text-muted-foreground">{a.tutorFullName ?? "—"}</span>
    ),
  },
  {
    key: "created",
    header: "Date",
    cell: (a) => (
      <span className="text-xs text-muted-foreground">
        {formatDay(a.createdAt)}
      </span>
    ),
  },
];

export default async function AssessmentsPage() {
  const actor = await requireAuth([
    "OWNER",
    "ADMIN",
    "ACADEMIC_MANAGER",
    "TUTOR",
    "PARENT",
  ]);
  ensure(actor, "assessment.read");

  const rows = await assessmentService.list({ limit: 100 });

  const canCreate =
    actor.role === "OWNER" ||
    actor.role === "ADMIN" ||
    actor.role === "ACADEMIC_MANAGER" ||
    actor.role === "TUTOR";

  return (
    <>
      <PageHeader
        title="Assessments"
        description="Diagnostic, progress, and final evaluations written by tutors."
        actions={
          canCreate ? (
            <Link href="/academics/assessments/new">
              <Button size="sm">New assessment</Button>
            </Link>
          ) : null
        }
      />
      <div className="p-6">
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(a) => a.id}
          emptyTitle="No assessments yet"
          emptyDescription="Write one after a session to start a paper trail."
        />
      </div>
    </>
  );
}
