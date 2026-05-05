import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { assessmentService } from "@/lib/services/assessmentService";
import { homeworkService } from "@/lib/services/homeworkService";
import { learningPlanService } from "@/lib/services/learningPlanService";
import { parentService } from "@/lib/services/parentService";
import { studentService } from "@/lib/services/studentService";
import { formatDay } from "@/lib/utils/dates";

import { StudentForm } from "../StudentForm";
import { DeleteStudentButton } from "./DeleteStudentButton";

export const metadata: Metadata = { title: "Student" };
export const dynamic = "force-dynamic";

export default async function StudentDetailPage({
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
  ensure(actor, "student.read");

  const { id } = await params;
  const student = await studentService.get(id);
  if (!student) notFound();

  const [parent, assessments, homework, plans] = await Promise.all([
    parentService.get(student.parentId),
    assessmentService.listForStudent(student.id),
    homeworkService.listForStudent(student.id),
    learningPlanService.listForStudent(student.id),
  ]);

  const canEdit =
    actor.role === "OWNER" ||
    actor.role === "ADMIN" ||
    actor.role === "ACADEMIC_MANAGER";
  const canCreateAcademics = canEdit || actor.role === "TUTOR";

  return (
    <>
      <PageHeader
        title={`${student.firstName} ${student.lastName}`}
        description={
          parent
            ? `Linked to ${parent.fullName} (${parent.email})`
            : "Linked parent missing."
        }
        actions={
          actor.role === "OWNER" || actor.role === "ADMIN" ? (
            <DeleteStudentButton studentId={student.id} />
          ) : null
        }
      />
      <div className="grid gap-4 p-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{canEdit ? "Edit student" : "Details"}</CardTitle>
            {parent ? (
              <Link
                href={`/parents/${parent.id}`}
                className="text-xs text-muted-foreground hover:underline"
              >
                Open parent profile
              </Link>
            ) : null}
          </CardHeader>
          <CardContent>
            {canEdit ? (
              <StudentForm
                mode="edit"
                studentId={student.id}
                initial={{
                  firstName: student.firstName,
                  lastName: student.lastName,
                  grade: student.grade ?? "",
                  school: student.school ?? "",
                  subjects: (student.subjects ?? []).join(", "),
                  isMinor: student.isMinor,
                  timezone: student.timezone ?? "",
                  notes: student.notes ?? "",
                }}
              />
            ) : (
              <StaticView
                rows={[
                  ["Grade", student.grade ?? "—"],
                  ["School", student.school ?? "—"],
                  ["Subjects", (student.subjects ?? []).join(", ") || "—"],
                  ["Minor", student.isMinor ? "yes" : "no"],
                  ["Timezone", student.timezone ?? "—"],
                  ["Notes", student.notes ?? "—"],
                ]}
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <AcademicSection
            title="Learning plans"
            empty="No plans yet."
            createHref={`/academics/learning-plans/new?studentId=${student.id}`}
            indexHref="/academics/learning-plans"
            canCreate={canCreateAcademics}
            items={plans.slice(0, 5).map((p) => ({
              key: p.id,
              href: `/academics/learning-plans/${p.id}`,
              primary: p.title,
              secondary: `${(p.goals ?? []).filter((g) => g.done).length}/${(p.goals ?? []).length} goals`,
              status: p.status,
            }))}
          />
          <AcademicSection
            title="Assessments"
            empty="No assessments yet."
            createHref={`/academics/assessments/new?studentId=${student.id}`}
            indexHref="/academics/assessments"
            canCreate={canCreateAcademics}
            items={assessments.slice(0, 5).map((a) => ({
              key: a.id,
              href: `/academics/assessments/${a.id}`,
              primary: a.title,
              secondary:
                a.scoreNumerator !== null && a.scoreDenominator !== null
                  ? `${a.subject} · ${a.scoreNumerator}/${a.scoreDenominator}`
                  : a.subject,
              status: a.type,
              date: a.createdAt,
            }))}
          />
          <AcademicSection
            title="Homework"
            empty="No homework yet."
            createHref={`/academics/homework/new?studentId=${student.id}`}
            indexHref="/academics/homework"
            canCreate={canCreateAcademics}
            items={homework.slice(0, 5).map((h) => ({
              key: h.id,
              href: `/academics/homework/${h.id}`,
              primary: h.title,
              secondary: h.dueDate
                ? `Due ${formatDay(h.dueDate)}`
                : "No due date",
              status: h.status,
            }))}
          />
        </div>
      </div>
    </>
  );
}

interface AcademicItem {
  key: string;
  href: string;
  primary: string;
  secondary?: string;
  status?: string;
  date?: Date;
}

function AcademicSection({
  title,
  items,
  empty,
  createHref,
  indexHref,
  canCreate,
}: {
  title: string;
  items: AcademicItem[];
  empty: string;
  createHref: string;
  indexHref: string;
  canCreate: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">{title}</CardTitle>
        <div className="flex items-center gap-2 text-xs">
          {canCreate ? (
            <Link
              href={createHref}
              className="text-primary underline-offset-2 hover:underline"
            >
              Add
            </Link>
          ) : null}
          <Link
            href={indexHref}
            className="text-muted-foreground underline-offset-2 hover:underline"
          >
            All
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">{empty}</p>
        ) : (
          items.map((it) => (
            <div
              key={it.key}
              className="flex items-start justify-between gap-2 rounded-md border px-3 py-2"
            >
              <div className="min-w-0">
                <Link href={it.href} className="font-medium hover:underline">
                  {it.primary}
                </Link>
                {it.secondary ? (
                  <p className="truncate text-xs text-muted-foreground">
                    {it.secondary}
                  </p>
                ) : null}
              </div>
              {it.status ? <StatusBadge status={it.status} /> : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function StaticView({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className="rounded-md border px-3 py-2">
          <dt className="text-xs text-muted-foreground">{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
