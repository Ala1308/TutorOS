"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { deleteInvoiceAction } from "../actions";

export function DeleteInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [isPending, startTransition] = useTransition();

  function onClick() {
    if (!confirm("Delete this invoice? Paid invoices must be voided instead."))
      return;
    startTransition(async () => {
      await deleteInvoiceAction(invoiceId);
    });
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={onClick}
      disabled={isPending}
    >
      {isPending ? "Deleting..." : "Delete"}
    </Button>
  );
}
