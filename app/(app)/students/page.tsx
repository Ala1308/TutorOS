import Link from "next/link";
import type { Metadata } from "next";

import { DataTable, type Column } from "@/components/common/DataTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import {
  studentService,
  type StudentWithParent,
} from "@/lib/services/studentService";
import { formatRelative } from "@/lib/utils/dates";

export const metadata: Metadata = { title: "Students" };
export const dynamic = "force-dynamic";

const columns: Column<StudentWithParent>[] = [
  {
    key: "name",
    header: "Name",
    cell: (s) => (
      <Link href={`/students/${s.id}`} className="font-medium hover:underline">
        {s.firstName} {s.lastName}
      </Link>
    ),
  },
  {
    key: "grade",
    header: "Grade",
    cell: (s) => (
      <span className="text-muted-foreground">{s.grade ?? "—"}</span>
    ),
  },
  {
    key: "subjects",
    header: "Subjects",
    cell: (s) => (
      <span className="text-muted-foreground">
        {(s.subjects ?? []).join(", ") || "—"}
      </span>
    ),
  },
  {
    key: "parent",
    header: "Parent",
    cell: (s) => (
      <Link
        href={`/parents/${s.parentId}`}
        className="text-muted-foreground hover:underline"
      >
        {s.parentName}
      </Link>
    ),
  },
  {
    key: "minor",
    header: "Minor",
    cell: (s) => (
      <span className="text-muted-foreground">{s.isMinor ? "yes" : "no"}</span>
    ),
  },
  {
    key: "created",
    header: "Created",
    cell: (s) => (
      <span className="text-muted-foreground">
        {formatRelative(s.createdAt)}
      </span>
    ),
  },
];

export default async function StudentsPage() {
  const actor = await requireAuth([
    "OWNER",
    "ADMIN",
    "ACADEMIC_MANAGER",
    "TUTOR",
    "PARENT",
  ]);
  ensure(actor, "student.read");

  const rows = await studentService.list({ limit: 100 });

  return (
    <>
      <PageHeader
        title="Students"
        description="Active students. Each student is linked to a parent account."
        actions={
          actor.role === "OWNER" ||
          actor.role === "ADMIN" ||
          actor.role === "ACADEMIC_MANAGER" ? (
            <Link href="/students/new">
              <Button size="sm">New student</Button>
            </Link>
          ) : null
        }
      />
      <div className="p-6">
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(s) => s.id}
          emptyTitle="No students yet"
          emptyDescription="Create a parent first, then add a student linked to them."
        />
      </div>
    </>
  );
}
