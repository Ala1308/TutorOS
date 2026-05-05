import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { learningPlanService } from "@/lib/services/learningPlanService";
import { studentService } from "@/lib/services/studentService";
import { tutorService } from "@/lib/services/tutorService";
import { formatDay } from "@/lib/utils/dates";

import { LearningPlanForm } from "../LearningPlanForm";
import { DeleteLearningPlanButton } from "./DeleteLearningPlanButton";

export const metadata: Metadata = { title: "Learning plan" };
export const dynamic = "force-dynamic";

export default async function LearningPlanDetailPage({
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
  ensure(actor, "learningPlan.read");

  const { id } = await params;
  const plan = await learningPlanService.get(id);
  if (!plan) notFound();

  const [student, tutors] = await Promise.all([
    studentService.get(plan.studentId),
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
  const goals = plan.goals ?? [];
  const done = goals.filter((g) => g.done).length;

  return (
    <>
      <PageHeader
        title={plan.title}
        description={
          student
            ? `${student.firstName} ${student.lastName}${plan.subject ? ` · ${plan.subject}` : ""}`
            : (plan.subject ?? "")
        }
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={plan.status} />
            {canDelete ? <DeleteLearningPlanButton planId={plan.id} /> : null}
          </div>
        }
      />
      <div className="grid gap-4 p-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Plan</CardTitle>
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
              <LearningPlanForm
                mode="edit"
                planId={plan.id}
                initial={{
                  studentId: plan.studentId,
                  tutorId: plan.tutorId ?? "",
                  title: plan.title,
                  summary: plan.summary ?? "",
                  subject: plan.subject ?? "",
                  status: plan.status,
                  startDate: plan.startDate ? plan.startDate.toISOString() : "",
                  endDate: plan.endDate ? plan.endDate.toISOString() : "",
                  goals: goals.map((g) => ({
                    id: g.id,
                    title: g.title,
                    done: g.done,
                    note: g.note ?? "",
                  })),
                }}
                tutorOptions={tutorOptions}
                lockStudent
              />
            ) : (
              <div className="space-y-3 text-sm">
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {plan.summary ?? "No summary."}
                </p>
                <ul className="space-y-1">
                  {goals.map((g) => (
                    <li key={g.id} className="flex items-start gap-2">
                      <span className="text-xs">{g.done ? "[x]" : "[ ]"}</span>
                      <div>
                        <p className="font-medium">{g.title}</p>
                        {g.note ? (
                          <p className="text-xs text-muted-foreground">
                            {g.note}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Meta label="Goals" value={`${done} done of ${goals.length}`} />
            <Meta
              label="Start"
              value={plan.startDate ? formatDay(plan.startDate) : "—"}
            />
            <Meta
              label="End"
              value={plan.endDate ? formatDay(plan.endDate) : "—"}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
