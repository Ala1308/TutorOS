"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserRole } from "@/lib/auth/types";

import { setInvoiceStatusAction, type InvoiceMutationResult } from "../actions";

interface Props {
  invoiceId: string;
  currentStatus: string;
  role: UserRole;
}

export function InvoiceStatusActions({
  invoiceId,
  currentStatus,
  role,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<InvoiceMutationResult | null>(null);
  const [paidAt, setPaidAt] = useState("");

  const canVoid = role === "OWNER" || role === "ADMIN";
  const canMarkPaid =
    role === "OWNER" || role === "ADMIN" || role === "ACADEMIC_MANAGER";
  const canManage = canMarkPaid;

  function go(status: string, extra: Record<string, unknown> = {}) {
    startTransition(async () => {
      const r = await setInvoiceStatusAction({
        invoiceId,
        status,
        ...extra,
      });
      setResult(r);
    });
  }

  function markPaid() {
    const iso = paidAt
      ? new Date(paidAt).toISOString()
      : new Date().toISOString();
    go("PAID", { paidAt: iso });
  }

  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs text-muted-foreground">
        Current: <span className="font-mono">{currentStatus}</span>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {canManage && currentStatus === "DRAFT" ? (
          <Button size="sm" disabled={isPending} onClick={() => go("SENT")}>
            Mark sent
          </Button>
        ) : null}
        {canManage && currentStatus === "SENT" ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={isPending}
            onClick={() => go("OVERDUE")}
          >
            Mark overdue
          </Button>
        ) : null}
        {canManage && currentStatus !== "PAID" && currentStatus !== "VOID" ? (
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => go("DRAFT")}
          >
            Back to draft
          </Button>
        ) : null}
        {canVoid && currentStatus !== "VOID" && currentStatus !== "PAID" ? (
          <Button
            size="sm"
            variant="destructive"
            disabled={isPending}
            onClick={() => go("VOID")}
          >
            Void
          </Button>
        ) : null}
      </div>

      {canMarkPaid && currentStatus !== "PAID" && currentStatus !== "VOID" ? (
        <div className="space-y-2 rounded-md border p-3">
          <p className="font-medium">Mark paid</p>
          <div>
            <Label htmlFor="paidAt">Paid on (defaults to today)</Label>
            <Input
              id="paidAt"
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
            />
          </div>
          <Button size="sm" disabled={isPending} onClick={markPaid}>
            Mark paid
          </Button>
        </div>
      ) : null}

      {result?.ok ? (
        <p className="text-xs text-muted-foreground">Saved.</p>
      ) : null}
      {result && !result.ok ? (
        <p className="text-xs text-destructive">{result.error}</p>
      ) : null}
    </div>
  );
}
