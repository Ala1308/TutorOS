import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { env } from "@/lib/env";
import { parentService } from "@/lib/services/parentService";
import { studentService } from "@/lib/services/studentService";
import type { Currency } from "@/lib/utils/money";

import { InvoiceForm } from "../InvoiceForm";

export const metadata: Metadata = { title: "New invoice" };
export const dynamic = "force-dynamic";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireAuth(["OWNER", "ADMIN", "ACADEMIC_MANAGER"]);
  ensure(actor, "invoice.create");

  const sp = await searchParams;
  const presetParent = typeof sp.parentId === "string" ? sp.parentId : "";
  const presetStudent = typeof sp.studentId === "string" ? sp.studentId : "";

  const [parents, students] = await Promise.all([
    parentService.list({ limit: 200 }),
    studentService.list({ limit: 200 }),
  ]);

  const parentOptions = parents.map((p) => ({
    id: p.id,
    label: `${p.fullName} · ${p.email}`,
  }));
  const studentOptions = students.map((s) => ({
    id: s.id,
    label: `${s.firstName} ${s.lastName} · ${s.parentName}`,
  }));

  const defaultCurrency = (env.DEFAULT_CURRENCY as Currency) ?? "CAD";

  return (
    <>
      <PageHeader
        title="New invoice"
        description="Add line items, set a due date, then send when ready."
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Invoice</CardTitle>
          </CardHeader>
          <CardContent>
            {parentOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You need at least one parent first.
              </p>
            ) : (
              <InvoiceForm
                mode="create"
                initial={{
                  parentId: presetParent,
                  studentId: presetStudent,
                  currency: defaultCurrency,
                  issuedAt: new Date().toISOString(),
                  dueAt: "",
                  taxDollars: "",
                  notes: "",
                  lineItems: [
                    {
                      key: "li_initial",
                      description: "",
                      quantity: "1",
                      unitDollars: "",
                    },
                  ],
                }}
                parentOptions={parentOptions}
                studentOptions={studentOptions}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
