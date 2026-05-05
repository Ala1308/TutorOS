import Link from "next/link";
import type { Metadata } from "next";

import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import {
  invoiceService,
  type InvoiceWithRefs,
} from "@/lib/services/invoiceService";
import { formatDay } from "@/lib/utils/dates";
import { formatMoney, type Currency } from "@/lib/utils/money";

export const metadata: Metadata = { title: "Invoices" };
export const dynamic = "force-dynamic";

const columns: Column<InvoiceWithRefs>[] = [
  {
    key: "number",
    header: "Invoice",
    cell: (i) => (
      <Link
        href={`/invoices/${i.id}`}
        className="font-mono text-xs font-medium hover:underline"
      >
        {i.invoiceNumber}
      </Link>
    ),
  },
  {
    key: "parent",
    header: "Parent",
    cell: (i) => (
      <Link
        href={`/parents/${i.parentId}`}
        className="text-muted-foreground hover:underline"
      >
        {i.parentName}
      </Link>
    ),
  },
  {
    key: "student",
    header: "Student",
    cell: (i) =>
      i.studentFirstName && i.studentLastName ? (
        <span className="text-muted-foreground">
          {i.studentFirstName} {i.studentLastName}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "issued",
    header: "Issued",
    cell: (i) => (
      <span className="text-xs text-muted-foreground">
        {i.issuedAt ? formatDay(i.issuedAt) : "—"}
      </span>
    ),
  },
  {
    key: "due",
    header: "Due",
    cell: (i) => (
      <span className="text-xs text-muted-foreground">
        {i.dueAt ? formatDay(i.dueAt) : "—"}
      </span>
    ),
  },
  {
    key: "total",
    header: "Total",
    cell: (i) => (
      <span className="font-mono text-xs">
        {formatMoney(i.totalCents, i.currency as Currency)}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (i) => <StatusBadge status={i.status} />,
  },
];

export default async function InvoicesPage() {
  const actor = await requireAuth([
    "OWNER",
    "ADMIN",
    "ACADEMIC_MANAGER",
    "PARENT",
  ]);
  ensure(actor, "invoice.read");

  const rows = await invoiceService.list({ limit: 100 });

  const canCreate =
    actor.role === "OWNER" ||
    actor.role === "ADMIN" ||
    actor.role === "ACADEMIC_MANAGER";

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Bill parents for tutoring. Status flows draft → sent → paid."
        actions={
          canCreate ? (
            <Link href="/invoices/new">
              <Button size="sm">New invoice</Button>
            </Link>
          ) : null
        }
      />
      <div className="p-6">
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(i) => i.id}
          emptyTitle="No invoices yet"
          emptyDescription="Create your first invoice to start billing."
        />
      </div>
    </>
  );
}
