import { z } from "zod";

import { defineTool } from "@/lib/ai/toolRegistry";
import { WORKFLOW_STEPS } from "@/lib/services/automationService";
import { invoiceService } from "@/lib/services/invoiceService";

const ROLES = ["OWNER", "ADMIN", "ACADEMIC_MANAGER", "AI_AGENT"] as const;
const HUMAN_ROLES = ["OWNER", "ADMIN", "ACADEMIC_MANAGER"] as const;

const CURRENCIES = ["CAD", "USD", "EUR", "GBP"] as const;

const invoiceLineItemInput = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().int().min(1).max(1000),
  unitCents: z.number().int().min(0).max(100_000_000),
  sessionId: z.string().uuid().optional(),
});

/**
 * Tool: invoice.create
 *
 * MEDIUM risk: creates a billable record. Agents must always create
 * invoices in DRAFT — never auto-send. Operator approval applies via
 * automation level / approval matrix at the workflow layer.
 */
export const invoiceCreateTool = defineTool({
  name: "invoice.create",
  description:
    "Create a draft invoice for a parent. Always starts as DRAFT — use the UI or invoice.send to send it. Money is in integer cents.",
  category: "medium",
  inputSchema: z.object({
    parentId: z.string().uuid(),
    studentId: z.string().uuid().optional(),
    currency: z.enum(CURRENCIES).optional(),
    issuedAt: z.string().datetime().optional(),
    dueAt: z.string().datetime().optional(),
    taxCents: z.number().int().min(0).max(100_000_000).optional(),
    notes: z.string().max(8000).optional(),
    lineItems: z.array(invoiceLineItemInput).min(1).max(100),
  }),
  outputSchema: z.object({
    invoiceId: z.string().uuid(),
    invoiceNumber: z.string(),
    status: z.string(),
    totalCents: z.number().int(),
    currency: z.string(),
  }),
  requiredRole: [...ROLES],
  riskLevel: "MEDIUM",
  workflowStep: WORKFLOW_STEPS.invoice.generation,
  buildApprovalDescription: (input) => {
    const lines = input.lineItems
      .map(
        (li) =>
          `• ${li.description} — ${li.quantity} × ${(
            li.unitCents / 100
          ).toFixed(2)} ${input.currency ?? "CAD"}`,
      )
      .join("\n");
    return {
      title: "Approve invoice draft",
      description: `Agent proposes drafting an invoice for parent ${input.parentId}.\n\n${lines}`,
      entityType: "Parent",
      entityId: input.parentId,
    };
  },
  handler: async (input, ctx) => {
    const row = await invoiceService.create(
      {
        ...input,
        currency: input.currency ?? "CAD",
        taxCents: input.taxCents ?? 0,
      },
      { actor: ctx.actor },
    );
    return {
      invoiceId: row.id,
      invoiceNumber: row.invoiceNumber,
      status: row.status,
      totalCents: row.totalCents,
      currency: row.currency,
    };
  },
});

/**
 * Tool: invoice.markPaid
 *
 * HIGH risk: only humans (or governance escalation) should record
 * payment. Agents should not flip an invoice to PAID unilaterally.
 */
export const invoiceMarkPaidTool = defineTool({
  name: "invoice.markPaid",
  description:
    "Mark an invoice as paid. paidAt defaults to now if omitted. High-risk; humans only.",
  category: "high",
  inputSchema: z.object({
    invoiceId: z.string().uuid(),
    paidAt: z.string().datetime().optional(),
  }),
  outputSchema: z.object({
    invoiceId: z.string().uuid(),
    status: z.string(),
    paidAt: z.string().nullable(),
  }),
  requiredRole: [...HUMAN_ROLES],
  riskLevel: "HIGH",
  handler: async (input, ctx) => {
    const row = await invoiceService.setStatus(
      {
        invoiceId: input.invoiceId,
        status: "PAID",
        ...(input.paidAt ? { paidAt: input.paidAt } : {}),
      },
      { actor: ctx.actor },
    );
    return {
      invoiceId: row.id,
      status: row.status,
      paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    };
  },
});

// invoice.markPaid is excluded from AI_AGENT entirely (HUMAN_ROLES only),
// so no workflowStep is set — the gate is unreachable for that tool.

/**
 * Tool: invoice.send
 *
 * MEDIUM risk: transitions DRAFT → SENT. Caller is responsible for the
 * actual email send (or operator clicks "send" out-of-band today).
 */
export const invoiceSendTool = defineTool({
  name: "invoice.send",
  description: "Mark a draft invoice as SENT. Records sentAt automatically.",
  category: "medium",
  inputSchema: z.object({
    invoiceId: z.string().uuid(),
  }),
  outputSchema: z.object({
    invoiceId: z.string().uuid(),
    status: z.string(),
    sentAt: z.string().nullable(),
  }),
  requiredRole: [...ROLES],
  riskLevel: "MEDIUM",
  workflowStep: WORKFLOW_STEPS.invoice.send,
  buildApprovalDescription: (input) => ({
    title: "Approve invoice send",
    description: `Agent proposes marking invoice ${input.invoiceId} as SENT.`,
    entityType: "Invoice",
    entityId: input.invoiceId,
  }),
  handler: async (input, ctx) => {
    const row = await invoiceService.setStatus(
      {
        invoiceId: input.invoiceId,
        status: "SENT",
      },
      { actor: ctx.actor },
    );
    return {
      invoiceId: row.id,
      status: row.status,
      sentAt: row.sentAt ? row.sentAt.toISOString() : null,
    };
  },
});
