import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { invoiceService } from "@/lib/services/invoiceService";
import { parentService } from "@/lib/services/parentService";
import { studentService } from "@/lib/services/studentService";
import { formatDateTime, formatDay } from "@/lib/utils/dates";
import { formatMoney, type Currency } from "@/lib/utils/money";

import { InvoiceForm } from "../InvoiceForm";
import { DeleteInvoiceButton } from "./DeleteInvoiceButton";
import { InvoiceStatusActions } from "./InvoiceStatusActions";

export const metadata: Metadata = { title: "Invoice" };
export const dynamic = "force-dynamic";

function centsToDollarString(cents: number): string {
  return (cents / 100).toFixed(2);
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireAuth([
    "OWNER",
    "ADMIN",
    "ACADEMIC_MANAGER",
    "PARENT",
  ]);
  ensure(actor, "invoice.read");

  const { id } = await params;
  const inv = await invoiceService.get(id);
  if (!inv) notFound();

  const [parent, students] = await Promise.all([
    parentService.get(inv.parentId),
    studentService.list({ limit: 200 }),
  ]);
  const student = inv.studentId
    ? await studentService.get(inv.studentId)
    : null;

  const isLocked = inv.status === "PAID" || inv.status === "VOID";
  const canEdit =
    !isLocked &&
    (actor.role === "OWNER" ||
      actor.role === "ADMIN" ||
      actor.role === "ACADEMIC_MANAGER");
  const canDelete = actor.role === "OWNER" || actor.role === "ADMIN";

  const studentOptions = students.map((s) => ({
    id: s.id,
    label: `${s.firstName} ${s.lastName} · ${s.parentName}`,
  }));

  const currency = inv.currency as Currency;

  return (
    <>
      <PageHeader
        title={inv.invoiceNumber}
        description={
          parent
            ? `Bill to ${parent.fullName} (${parent.email})${student ? ` · ${student.firstName} ${student.lastName}` : ""}`
            : "Invoice"
        }
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={inv.status} />
            {canDelete ? <DeleteInvoiceButton invoiceId={inv.id} /> : null}
          </div>
        }
      />
      <div className="grid gap-4 p-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Invoice</CardTitle>
            <span className="text-xs text-muted-foreground">
              Total · {formatMoney(inv.totalCents, currency)}
            </span>
          </CardHeader>
          <CardContent>
            {canEdit ? (
              <InvoiceForm
                mode="edit"
                invoiceId={inv.id}
                initial={{
                  parentId: inv.parentId,
                  studentId: inv.studentId ?? "",
                  currency,
                  issuedAt: inv.issuedAt ? inv.issuedAt.toISOString() : "",
                  dueAt: inv.dueAt ? inv.dueAt.toISOString() : "",
                  taxDollars: centsToDollarString(inv.taxCents),
                  notes: inv.notes ?? "",
                  lineItems: inv.lineItems.map((li) => ({
                    key: li.id,
                    description: li.description,
                    quantity: String(li.quantity),
                    unitDollars: centsToDollarString(li.unitCents),
                  })),
                }}
                studentOptions={studentOptions}
                lockParent
              />
            ) : (
              <ReadOnlyInvoice
                lineItems={inv.lineItems.map((li) => ({
                  description: li.description,
                  quantity: li.quantity,
                  unitCents: li.unitCents,
                  amountCents: li.amountCents,
                }))}
                currency={currency}
                subtotalCents={inv.subtotalCents}
                taxCents={inv.taxCents}
                totalCents={inv.totalCents}
                notes={inv.notes ?? ""}
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <InvoiceStatusActions
                invoiceId={inv.id}
                currentStatus={inv.status}
                role={actor.role}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Meta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Meta
                label="Issued"
                value={inv.issuedAt ? formatDay(inv.issuedAt) : "—"}
              />
              <Meta
                label="Due"
                value={inv.dueAt ? formatDay(inv.dueAt) : "—"}
              />
              <Meta
                label="Sent"
                value={inv.sentAt ? formatDateTime(inv.sentAt) : "—"}
              />
              <Meta
                label="Paid"
                value={inv.paidAt ? formatDateTime(inv.paidAt) : "—"}
              />
              <Meta
                label="Parent"
                value={
                  parent ? (
                    <Link
                      href={`/parents/${parent.id}`}
                      className="text-primary hover:underline"
                    >
                      {parent.fullName}
                    </Link>
                  ) : (
                    "—"
                  )
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function ReadOnlyInvoice({
  lineItems,
  currency,
  subtotalCents,
  taxCents,
  totalCents,
  notes,
}: {
  lineItems: Array<{
    description: string;
    quantity: number;
    unitCents: number;
    amountCents: number;
  }>;
  currency: Currency;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  notes: string;
}) {
  return (
    <div className="space-y-3 text-sm">
      <table className="w-full text-left">
        <thead className="border-b text-xs text-muted-foreground">
          <tr>
            <th className="py-1">Description</th>
            <th className="py-1 text-right">Qty</th>
            <th className="py-1 text-right">Unit</th>
            <th className="py-1 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((li, idx) => (
            <tr key={idx} className="border-b last:border-b-0">
              <td className="py-1">{li.description}</td>
              <td className="py-1 text-right font-mono">{li.quantity}</td>
              <td className="py-1 text-right font-mono">
                {formatMoney(li.unitCents, currency)}
              </td>
              <td className="py-1 text-right font-mono">
                {formatMoney(li.amountCents, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ml-auto w-full max-w-xs space-y-1">
        <Row label="Subtotal" value={formatMoney(subtotalCents, currency)} />
        <Row label="Tax" value={formatMoney(taxCents, currency)} />
        <div className="flex items-center justify-between border-t pt-1 font-medium">
          <span>Total</span>
          <span>{formatMoney(totalCents, currency)}</span>
        </div>
      </div>
      {notes ? (
        <div className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-xs">
          {notes}
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
