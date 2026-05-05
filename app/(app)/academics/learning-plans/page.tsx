import Link from "next/link";
import type { Metadata } from "next";

import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import {
  learningPlanService,
  type LearningPlanWithRefs,
} from "@/lib/services/learningPlanService";
import { formatDay } from "@/lib/utils/dates";

export const metadata: Metadata = { title: "Learning plans" };
export const dynamic = "force-dynamic";

const columns: Column<LearningPlanWithRefs>[] = [
  {
    key: "title",
    header: "Title",
    cell: (p) => (
      <Link
        href={`/academics/learning-plans/${p.id}`}
        className="font-medium hover:underline"
      >
        {p.title}
      </Link>
    ),
  },
  {
    key: "student",
    header: "Student",
    cell: (p) => (
      <Link
        href={`/students/${p.studentId}`}
        className="text-muted-foreground hover:underline"
      >
        {p.studentFirstName} {p.studentLastName}
      </Link>
    ),
  },
  {
    key: "subject",
    header: "Subject",
    cell: (p) => (
      <span className="text-muted-foreground">{p.subject ?? "—"}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (p) => <StatusBadge status={p.status} />,
  },
  {
    key: "goals",
    header: "Goals",
    cell: (p) => {
      const total = (p.goals ?? []).length;
      const done = (p.goals ?? []).filter((g) => g.done).length;
      return (
        <span className="text-xs text-muted-foreground">
          {done} / {total}
        </span>
      );
    },
  },
  {
    key: "window",
    header: "Window",
    cell: (p) => (
      <span className="text-xs text-muted-foreground">
        {p.startDate ? formatDay(p.startDate) : "—"} →{" "}
        {p.endDate ? formatDay(p.endDate) : "—"}
      </span>
    ),
  },
];

export default async function LearningPlansPage() {
  const actor = await requireAuth([
    "OWNER",
    "ADMIN",
    "ACADEMIC_MANAGER",
    "TUTOR",
    "PARENT",
  ]);
  ensure(actor, "learningPlan.read");

  const rows = await learningPlanService.list({ limit: 100 });

  const canCreate =
    actor.role === "OWNER" ||
    actor.role === "ADMIN" ||
    actor.role === "ACADEMIC_MANAGER" ||
    actor.role === "TUTOR";

  return (
    <>
      <PageHeader
        title="Learning plans"
        description="Multi-week plans tied to a student. Track goals as they get checked off."
        actions={
          canCreate ? (
            <Link href="/academics/learning-plans/new">
              <Button size="sm">New plan</Button>
            </Link>
          ) : null
        }
      />
      <div className="p-6">
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(p) => p.id}
          emptyTitle="No learning plans yet"
          emptyDescription="Create one to give a student a clear roadmap."
        />
      </div>
    </>
  );
}
