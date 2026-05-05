import Link from "next/link";
import type { Metadata } from "next";

import { DataTable, type Column } from "@/components/common/DataTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { parentService } from "@/lib/services/parentService";
import { formatRelative } from "@/lib/utils/dates";

import type { Parent } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Parents" };
export const dynamic = "force-dynamic";

const columns: Column<Parent>[] = [
  {
    key: "name",
    header: "Name",
    cell: (p) => (
      <Link href={`/parents/${p.id}`} className="font-medium hover:underline">
        {p.fullName}
      </Link>
    ),
  },
  {
    key: "email",
    header: "Email",
    cell: (p) => <span className="text-muted-foreground">{p.email}</span>,
  },
  {
    key: "phone",
    header: "Phone",
    cell: (p) => (
      <span className="text-muted-foreground">{p.phone ?? "—"}</span>
    ),
  },
  {
    key: "created",
    header: "Created",
    cell: (p) => (
      <span className="text-muted-foreground">
        {formatRelative(p.createdAt)}
      </span>
    ),
  },
];

export default async function ParentsPage() {
  const actor = await requireAuth(["OWNER", "ADMIN", "ACADEMIC_MANAGER"]);
  ensure(actor, "parent.read");

  const rows = await parentService.list({ limit: 100 });
  return (
    <>
      <PageHeader
        title="Parents"
        description="Parent accounts. The source of truth for billing and student guardianship."
        actions={
          <Link href="/parents/new">
            <Button size="sm">New parent</Button>
          </Link>
        }
      />
      <div className="p-6">
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(p) => p.id}
          emptyTitle="No parents yet"
          emptyDescription="Create one manually, or convert a qualified lead."
        />
      </div>
    </>
  );
}
