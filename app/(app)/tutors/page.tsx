import Link from "next/link";
import type { Metadata } from "next";

import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { tutorService } from "@/lib/services/tutorService";
import { formatRelative } from "@/lib/utils/dates";
import { formatMoney } from "@/lib/utils/money";

import type { Tutor } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Tutors" };
export const dynamic = "force-dynamic";

const columns: Column<Tutor>[] = [
  {
    key: "name",
    header: "Name",
    cell: (t) => (
      <Link href={`/tutors/${t.id}`} className="font-medium hover:underline">
        {t.fullName}
      </Link>
    ),
  },
  {
    key: "email",
    header: "Email",
    cell: (t) => <span className="text-muted-foreground">{t.email}</span>,
  },
  {
    key: "status",
    header: "Status",
    cell: (t) => <StatusBadge status={t.status} />,
  },
  {
    key: "subjects",
    header: "Subjects",
    cell: (t) => (
      <span className="text-muted-foreground">
        {(t.subjects ?? []).join(", ") || "—"}
      </span>
    ),
  },
  {
    key: "rate",
    header: "Hourly",
    cell: (t) => (
      <span className="text-muted-foreground">
        {t.hourlyRateCents != null ? formatMoney(t.hourlyRateCents) : "—"}
      </span>
    ),
  },
  {
    key: "created",
    header: "Created",
    cell: (t) => (
      <span className="text-muted-foreground">
        {formatRelative(t.createdAt)}
      </span>
    ),
  },
];

export default async function TutorsPage() {
  const actor = await requireAuth(["OWNER", "ADMIN", "ACADEMIC_MANAGER"]);
  ensure(actor, "tutor.read");

  const rows = await tutorService.list({ limit: 100 });

  return (
    <>
      <PageHeader
        title="Tutors"
        description="Tutor roster — applicants through active staff."
        actions={
          <Link href="/tutors/new">
            <Button size="sm">New tutor</Button>
          </Link>
        }
      />
      <div className="p-6">
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(t) => t.id}
          emptyTitle="No tutors yet"
          emptyDescription="Add an applicant to start the screening pipeline."
        />
      </div>
    </>
  );
}
