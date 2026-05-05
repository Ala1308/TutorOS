import { z } from "zod";

const INVOICE_STATUSES = ["DRAFT", "SENT", "PAID", "OVERDUE", "VOID"] as const;
const CURRENCIES = ["CAD", "USD", "EUR", "GBP"] as const;

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((s) => (s ? s.trim() : undefined));

const optionalIso = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((s) => (s ? s : undefined))
  .refine((s) => s === undefined || !Number.isNaN(Date.parse(s)), {
    message: "Invalid date",
  });

const optionalUuid = z
  .string()
  .uuid()
  .optional()
  .or(z.literal(""))
  .transform((s) => (s ? s : undefined));

export const invoiceLineItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().int().min(1).max(1000),
  unitCents: z.number().int().min(0).max(100_000_000),
  sessionId: optionalUuid,
});
export type InvoiceLineItemInput = z.infer<typeof invoiceLineItemSchema>;

export const invoiceCreateSchema = z.object({
  parentId: z.string().uuid(),
  studentId: optionalUuid,
  currency: z.enum(CURRENCIES).default("CAD"),
  issuedAt: optionalIso,
  dueAt: optionalIso,
  taxCents: z.number().int().min(0).max(100_000_000).default(0),
  notes: optionalText(8000),
  lineItems: z.array(invoiceLineItemSchema).min(1).max(100),
});
export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;

export const invoiceUpdateSchema = z.object({
  studentId: optionalUuid,
  issuedAt: optionalIso,
  dueAt: optionalIso,
  taxCents: z.number().int().min(0).max(100_000_000).optional(),
  notes: optionalText(8000),
  /**
   * If provided, replaces all line items. Pass undefined to leave them
   * unchanged.
   */
  lineItems: z.array(invoiceLineItemSchema).min(1).max(100).optional(),
});
export type InvoiceUpdateInput = z.infer<typeof invoiceUpdateSchema>;

export const invoiceStatusSchema = z.object({
  invoiceId: z.string().uuid(),
  status: z.enum(INVOICE_STATUSES),
  paidAt: optionalIso,
});
export type InvoiceStatusInput = z.infer<typeof invoiceStatusSchema>;

export const INVOICE_STATUS_VALUES = INVOICE_STATUSES;
export const INVOICE_CURRENCY_VALUES = CURRENCIES;
