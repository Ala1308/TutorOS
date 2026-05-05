import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth";
import { can, ensure } from "@/lib/auth/permissions";
import { commsService } from "@/lib/services/commsService";
import { invoiceService } from "@/lib/services/invoiceService";
import { parentService } from "@/lib/services/parentService";
import { studentService } from "@/lib/services/studentService";
import { formatDay } from "@/lib/utils/dates";
import { formatMoney, type Currency } from "@/lib/utils/money";

import { CommunicationsFeed } from "../../communications/CommunicationsFeed";
import { ParentForm } from "../ParentForm";
import { DeleteParentButton } from "./DeleteParentButton";

export const metadata: Metadata = { title: "Parent" };
export const dynamic = "force-dynamic";

export default async function ParentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireAuth(["OWNER", "ADMIN", "ACADEMIC_MANAGER"]);
  ensure(actor, "parent.read");

  const { id } = await params;
  const parent = await parentService.get(id);
  if (!parent) notFound();

  const canRead = can(actor, "comm.read");
  const [children, invoices, comms] = await Promise.all([
    studentService.listForParent(parent.id),
    invoiceService.list({ parentId: parent.id, limit: 20 }),
    canRead
      ? commsService.list({
          entityType: "parent",
          entityId: parent.id,
          limit: 20,
        })
      : Promise.resolve([]),
  ]);

  const canCreateInvoice =
    actor.role === "OWNER" ||
    actor.role === "ADMIN" ||
    actor.role === "ACADEMIC_MANAGER";
  const canLogComm = can(actor, "comm.log");

  return (
    <>
      <PageHeader
        title={parent.fullName}
        description={parent.email}
        actions={
          actor.role === "OWNER" || actor.role === "ADMIN" ? (
            <DeleteParentButton parentId={parent.id} />
          ) : null
        }
      />
      <div className="grid gap-4 p-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <ParentForm
              mode="edit"
              parentId={parent.id}
              initial={{
                fullName: parent.fullName,
                email: parent.email,
                phone: parent.phone ?? "",
                timezone: parent.timezone ?? "",
                notes: parent.notes ?? "",
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Students ({children.length})</CardTitle>
            <Link href={`/students/new?parentId=${parent.id}`}>
              <Button size="sm" variant="secondary">
                Add student
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {children.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No students linked yet.
              </p>
            ) : (
              <ul className="divide-y text-sm">
                {children.map((s) => (
                  <li key={s.id} className="py-2">
                    <Link
                      href={`/students/${s.id}`}
                      className="font-medium hover:underline"
                    >
                      {s.firstName} {s.lastName}
                    </Link>
                    <span className="ml-2 text-muted-foreground">
                      {s.grade ? `Grade ${s.grade}` : "Grade —"} ·{" "}
                      {(s.subjects ?? []).join(", ") || "No subjects"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {canRead ? (
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent communications ({comms.length})</CardTitle>
              {canLogComm ? (
                <div className="flex items-center gap-2 text-xs">
                  <Link
                    href={`/communications/log-email?entityType=parent&entityId=${parent.id}`}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    Log email
                  </Link>
                  <Link
                    href={`/communications/log-call?entityType=parent&entityId=${parent.id}`}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    Log call
                  </Link>
                </div>
              ) : null}
            </CardHeader>
            <CardContent>
              <CommunicationsFeed items={comms} />
            </CardContent>
          </Card>
        ) : null}

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Invoices ({invoices.length})</CardTitle>
            {canCreateInvoice ? (
              <Link href={`/invoices/new?parentId=${parent.id}`}>
                <Button size="sm" variant="secondary">
                  New invoice
                </Button>
              </Link>
            ) : null}
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No invoices for this parent yet.
              </p>
            ) : (
              <ul className="divide-y text-sm">
                {invoices.map((i) => (
                  <li
                    key={i.id}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/invoices/${i.id}`}
                        className="font-mono text-xs font-medium hover:underline"
                      >
                        {i.invoiceNumber}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {i.issuedAt ? formatDay(i.issuedAt) : "—"} ·{" "}
                        {formatMoney(i.totalCents, i.currency as Currency)}
                      </p>
                    </div>
                    <StatusBadge status={i.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
