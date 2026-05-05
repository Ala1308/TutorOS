import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { idCol, softDelete, timestamps } from "./_helpers";
import { invoiceStatusEnum } from "./enums";
import { parents } from "./parents";
import { tutoringSessions } from "./sessions";
import { students } from "./students";

/**
 * An invoice is owed by a `parent` for services rendered to a `student`.
 * Money is stored as integer cents, never floats. `currency` is denormalised
 * onto the invoice so historical totals are stable even if defaults change.
 */
export const invoices = pgTable(
  "invoices",
  {
    id: idCol(),
    invoiceNumber: text("invoice_number").notNull().unique(),
    parentId: uuid("parent_id")
      .notNull()
      .references(() => parents.id, { onDelete: "restrict" }),
    studentId: uuid("student_id").references(() => students.id, {
      onDelete: "set null",
    }),

    status: invoiceStatusEnum("status").notNull().default("DRAFT"),
    currency: text("currency").notNull().default("CAD"),

    issuedAt: timestamp("issued_at", { withTimezone: true }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),

    subtotalCents: integer("subtotal_cents").notNull().default(0),
    taxCents: integer("tax_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull().default(0),

    notes: text("notes"),
    externalId: text("external_id"),

    ...timestamps(),
    ...softDelete(),
  },
  (t) => ({
    parentIdx: index("invoices_parent_idx").on(t.parentId, t.createdAt),
    statusIdx: index("invoices_status_idx").on(t.status),
    numberIdx: index("invoices_number_idx").on(t.invoiceNumber),
  }),
);

/**
 * One line on an invoice. `amountCents` is `quantity * unitCents` cached on
 * insert/update so reads don't have to recompute, and so totals stay stable
 * if the schema later supports per-line discounts.
 */
export const invoiceLineItems = pgTable(
  "invoice_line_items",
  {
    id: idCol(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").references(() => tutoringSessions.id, {
      onDelete: "set null",
    }),

    description: text("description").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitCents: integer("unit_cents").notNull(),
    amountCents: integer("amount_cents").notNull(),

    ...timestamps(),
  },
  (t) => ({
    invoiceIdx: index("invoice_line_items_invoice_idx").on(t.invoiceId),
  }),
);

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  parent: one(parents, {
    fields: [invoices.parentId],
    references: [parents.id],
  }),
  student: one(students, {
    fields: [invoices.studentId],
    references: [students.id],
  }),
  lineItems: many(invoiceLineItems),
}));

export const invoiceLineItemsRelations = relations(
  invoiceLineItems,
  ({ one }) => ({
    invoice: one(invoices, {
      fields: [invoiceLineItems.invoiceId],
      references: [invoices.id],
    }),
    session: one(tutoringSessions, {
      fields: [invoiceLineItems.sessionId],
      references: [tutoringSessions.id],
    }),
  }),
);

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;
export type NewInvoiceLineItem = typeof invoiceLineItems.$inferInsert;
