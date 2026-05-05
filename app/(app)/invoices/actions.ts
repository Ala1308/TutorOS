"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { logger } from "@/lib/logger";
import {
  INVOICE_STATUS_VALUES,
  invoiceCreateSchema,
  invoiceStatusSchema,
  invoiceUpdateSchema,
} from "@/lib/schemas/invoices";
import { invoiceService } from "@/lib/services/invoiceService";
import { AppError } from "@/lib/utils/errors";

const idSchema = z.string().uuid();
const statusSchema = z.enum(INVOICE_STATUS_VALUES);

export type InvoiceMutationResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

const ROLES = ["OWNER", "ADMIN", "ACADEMIC_MANAGER"] as const;

export async function createInvoiceAction(
  input: unknown,
): Promise<InvoiceMutationResult> {
  const actor = await requireAuth([...ROLES]);
  ensure(actor, "invoice.create");

  const parsed = invoiceCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid invoice",
    };
  }

  try {
    const row = await invoiceService.create(parsed.data, { actor });
    revalidatePath("/invoices");
    revalidatePath(`/parents/${row.parentId}`);
    revalidatePath("/audit-log");
    return { ok: true, id: row.id };
  } catch (err) {
    logger.warn({ err }, "createInvoiceAction failed");
    if (err instanceof AppError) return { ok: false, error: err.message };
    return { ok: false, error: "Could not create invoice. Check logs." };
  }
}

export async function updateInvoiceAction(
  id: unknown,
  input: unknown,
): Promise<InvoiceMutationResult> {
  const actor = await requireAuth([...ROLES]);
  ensure(actor, "invoice.update");

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Invalid id" };

  const parsed = invoiceUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid invoice",
    };
  }

  try {
    const row = await invoiceService.update(parsedId.data, parsed.data, {
      actor,
    });
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${parsedId.data}`);
    revalidatePath(`/parents/${row.parentId}`);
    revalidatePath("/audit-log");
    return { ok: true };
  } catch (err) {
    logger.warn({ err, id: parsedId.data }, "updateInvoiceAction failed");
    if (err instanceof AppError) return { ok: false, error: err.message };
    return { ok: false, error: "Could not update invoice. Check logs." };
  }
}

export async function setInvoiceStatusAction(input: {
  invoiceId: unknown;
  status: unknown;
  paidAt?: string | null;
}): Promise<InvoiceMutationResult> {
  const actor = await requireAuth([...ROLES]);
  const parsedId = idSchema.safeParse(input.invoiceId);
  const parsedStatus = statusSchema.safeParse(input.status);
  if (!parsedId.success || !parsedStatus.success) {
    return { ok: false, error: "Invalid input" };
  }

  if (parsedStatus.data === "VOID") {
    ensure(actor, "invoice.void");
  } else if (parsedStatus.data === "PAID") {
    ensure(actor, "invoice.markPaid");
  } else if (parsedStatus.data === "SENT") {
    ensure(actor, "invoice.send");
  } else {
    ensure(actor, "invoice.update");
  }

  const merged = {
    invoiceId: parsedId.data,
    status: parsedStatus.data,
    ...(input.paidAt ? { paidAt: input.paidAt } : {}),
  };
  const parsed = invoiceStatusSchema.safeParse(merged);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid status",
    };
  }

  try {
    await invoiceService.setStatus(parsed.data, { actor });
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${parsedId.data}`);
    revalidatePath("/audit-log");
    return { ok: true };
  } catch (err) {
    logger.warn({ err, id: parsedId.data }, "setInvoiceStatusAction failed");
    if (err instanceof AppError) return { ok: false, error: err.message };
    return { ok: false, error: "Could not update status. Check logs." };
  }
}

export async function deleteInvoiceAction(id: unknown): Promise<void> {
  const actor = await requireAuth(["OWNER", "ADMIN"]);
  ensure(actor, "invoice.delete");

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return;

  try {
    await invoiceService.softDelete(parsedId.data, { actor });
    revalidatePath("/invoices");
    revalidatePath("/audit-log");
  } catch (err) {
    logger.warn({ err, id: parsedId.data }, "deleteInvoiceAction failed");
    return;
  }
  redirect("/invoices?deleted=1");
}
