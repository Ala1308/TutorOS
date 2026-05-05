import { and, count, desc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  invoiceLineItems,
  invoices,
  parents,
  students,
  tutoringSessions,
  tutors,
  type Invoice,
  type InvoiceLineItem,
  type NewInvoice,
  type NewInvoiceLineItem,
} from "@/lib/db/schema";
import {
  invoiceCreateSchema,
  invoiceStatusSchema,
  invoiceUpdateSchema,
  type InvoiceCreateInput,
  type InvoiceLineItemInput,
  type InvoiceStatusInput,
  type InvoiceUpdateInput,
} from "@/lib/schemas/invoices";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/lib/utils/errors";

import type { Actor } from "@/lib/auth/types";

import { auditService } from "./auditService";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const ENTITY = "Invoice";

export interface InvoiceWithRefs extends Invoice {
  parentName: string;
  parentEmail: string;
  studentFirstName: string | null;
  studentLastName: string | null;
}

export interface InvoiceWithLineItems extends Invoice {
  lineItems: InvoiceLineItem[];
}

function lineAmountCents(li: InvoiceLineItemInput): number {
  return li.quantity * li.unitCents;
}

function computeTotals(
  lineItems: InvoiceLineItemInput[],
  taxCents: number,
): { subtotalCents: number; totalCents: number } {
  const subtotalCents = lineItems.reduce(
    (sum, li) => sum + lineAmountCents(li),
    0,
  );
  return { subtotalCents, totalCents: subtotalCents + taxCents };
}

/**
 * Generates an invoice number like INV-202605-0042. Uses a transaction-scoped
 * count of all invoices created in the same calendar month and retries on
 * unique-constraint collisions caused by races.
 */
async function generateInvoiceNumber(tx: Tx): Promise<string> {
  const now = new Date();
  const ym = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  // Count existing invoices for this prefix (ignoring soft-deletes is fine — we
  // never reuse numbers regardless).
  const result = await tx
    .select({ value: count() })
    .from(invoices)
    .where(sql`${invoices.invoiceNumber} LIKE ${`INV-${ym}-%`}`);
  const next = (result[0]?.value ?? 0) + 1;
  return `INV-${ym}-${String(next).padStart(4, "0")}`;
}

export const invoiceService = {
  async list(
    args: { limit?: number; offset?: number; parentId?: string } = {},
  ): Promise<InvoiceWithRefs[]> {
    const limit = Math.min(args.limit ?? 50, 100);
    const offset = args.offset ?? 0;

    const filters = [isNull(invoices.deletedAt)];
    if (args.parentId) filters.push(eq(invoices.parentId, args.parentId));

    const rows = await db
      .select({
        i: invoices,
        parentName: parents.fullName,
        parentEmail: parents.email,
        studentFirstName: students.firstName,
        studentLastName: students.lastName,
      })
      .from(invoices)
      .innerJoin(parents, eq(invoices.parentId, parents.id))
      .leftJoin(students, eq(invoices.studentId, students.id))
      .where(and(...filters))
      .orderBy(desc(invoices.createdAt))
      .limit(limit)
      .offset(offset);

    return rows.map((r) => ({
      ...r.i,
      parentName: r.parentName,
      parentEmail: r.parentEmail,
      studentFirstName: r.studentFirstName,
      studentLastName: r.studentLastName,
    }));
  },

  async get(id: string): Promise<InvoiceWithLineItems | null> {
    const [row] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, id), isNull(invoices.deletedAt)))
      .limit(1);
    if (!row) return null;
    const items = await db
      .select()
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, id))
      .orderBy(invoiceLineItems.createdAt);
    return { ...row, lineItems: items };
  },

  async getOrThrow(id: string): Promise<InvoiceWithLineItems> {
    const row = await this.get(id);
    if (!row) throw new NotFoundError("Invoice not found");
    return row;
  },

  async create(
    input: InvoiceCreateInput,
    opts: { actor: Actor },
  ): Promise<InvoiceWithLineItems> {
    const validated = invoiceCreateSchema.parse(input);

    return db.transaction(async (tx) => {
      const [parent] = await tx
        .select({ id: parents.id })
        .from(parents)
        .where(
          and(eq(parents.id, validated.parentId), isNull(parents.deletedAt)),
        )
        .limit(1);
      if (!parent) throw new ValidationError("Parent does not exist");

      if (validated.studentId) {
        const [student] = await tx
          .select({ id: students.id })
          .from(students)
          .where(
            and(
              eq(students.id, validated.studentId),
              isNull(students.deletedAt),
            ),
          )
          .limit(1);
        if (!student) throw new ValidationError("Student does not exist");
      }

      const totals = computeTotals(validated.lineItems, validated.taxCents);

      let invoiceNumber = await generateInvoiceNumber(tx);
      let inserted: Invoice | undefined;
      // Up to 3 retries on number collisions (race between concurrent inserts).
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const row: NewInvoice = {
          invoiceNumber,
          parentId: validated.parentId,
          status: "DRAFT",
          currency: validated.currency,
          subtotalCents: totals.subtotalCents,
          taxCents: validated.taxCents,
          totalCents: totals.totalCents,
          ...(validated.studentId ? { studentId: validated.studentId } : {}),
          ...(validated.issuedAt
            ? { issuedAt: new Date(validated.issuedAt) }
            : {}),
          ...(validated.dueAt ? { dueAt: new Date(validated.dueAt) } : {}),
          ...(validated.notes ? { notes: validated.notes } : {}),
        };
        try {
          const result = await tx.insert(invoices).values(row).returning();
          inserted = result[0];
          break;
        } catch (err) {
          if (
            err &&
            typeof err === "object" &&
            "code" in err &&
            (err as { code?: string }).code === "23505"
          ) {
            invoiceNumber = await generateInvoiceNumber(tx);
            continue;
          }
          throw err;
        }
      }
      if (!inserted) {
        throw new ConflictError(
          "Could not allocate a unique invoice number; try again.",
        );
      }

      const lineRows: NewInvoiceLineItem[] = validated.lineItems.map((li) => ({
        invoiceId: inserted!.id,
        description: li.description,
        quantity: li.quantity,
        unitCents: li.unitCents,
        amountCents: lineAmountCents(li),
        ...(li.sessionId ? { sessionId: li.sessionId } : {}),
      }));
      const items = await tx
        .insert(invoiceLineItems)
        .values(lineRows)
        .returning();

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "invoice.created",
          entityType: ENTITY,
          entityId: inserted.id,
          metadata: {
            parentId: inserted.parentId,
            invoiceNumber: inserted.invoiceNumber,
            totalCents: inserted.totalCents,
            lineItemCount: items.length,
          },
        },
        tx,
      );

      return { ...inserted, lineItems: items };
    });
  },

  async update(
    id: string,
    input: InvoiceUpdateInput,
    opts: { actor: Actor },
  ): Promise<InvoiceWithLineItems> {
    const validated = invoiceUpdateSchema.parse(input);

    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(invoices)
        .where(and(eq(invoices.id, id), isNull(invoices.deletedAt)))
        .limit(1);
      if (!existing) throw new NotFoundError("Invoice not found");

      if (existing.status === "PAID" || existing.status === "VOID") {
        throw new ConflictError(
          "Paid or void invoices cannot be edited. Create a new one instead.",
        );
      }

      if (validated.studentId) {
        const [student] = await tx
          .select({ id: students.id })
          .from(students)
          .where(
            and(
              eq(students.id, validated.studentId),
              isNull(students.deletedAt),
            ),
          )
          .limit(1);
        if (!student) throw new ValidationError("Student does not exist");
      }

      const taxCents = validated.taxCents ?? existing.taxCents;

      let subtotalCents = existing.subtotalCents;
      let nextItems: InvoiceLineItem[] | null = null;
      if (validated.lineItems) {
        await tx
          .delete(invoiceLineItems)
          .where(eq(invoiceLineItems.invoiceId, id));
        const lineRows: NewInvoiceLineItem[] = validated.lineItems.map(
          (li) => ({
            invoiceId: id,
            description: li.description,
            quantity: li.quantity,
            unitCents: li.unitCents,
            amountCents: lineAmountCents(li),
            ...(li.sessionId ? { sessionId: li.sessionId } : {}),
          }),
        );
        nextItems = await tx
          .insert(invoiceLineItems)
          .values(lineRows)
          .returning();
        subtotalCents = nextItems.reduce((sum, it) => sum + it.amountCents, 0);
      }

      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
        subtotalCents,
        taxCents,
        totalCents: subtotalCents + taxCents,
      };
      if (validated.studentId !== undefined)
        updates.studentId = validated.studentId;
      if (validated.issuedAt !== undefined)
        updates.issuedAt = new Date(validated.issuedAt);
      if (validated.dueAt !== undefined)
        updates.dueAt = new Date(validated.dueAt);
      if (validated.notes !== undefined) updates.notes = validated.notes;

      const [updated] = await tx
        .update(invoices)
        .set(updates)
        .where(eq(invoices.id, id))
        .returning();
      if (!updated) throw new Error("Failed to update invoice");

      const items =
        nextItems ??
        (await tx
          .select()
          .from(invoiceLineItems)
          .where(eq(invoiceLineItems.invoiceId, id))
          .orderBy(invoiceLineItems.createdAt));

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "invoice.updated",
          entityType: ENTITY,
          entityId: id,
          metadata: {
            changed: Object.keys(updates).filter((k) => k !== "updatedAt"),
            lineItemCount: items.length,
          },
        },
        tx,
      );

      return { ...updated, lineItems: items };
    });
  },

  async setStatus(
    input: InvoiceStatusInput,
    opts: { actor: Actor },
  ): Promise<Invoice> {
    const validated = invoiceStatusSchema.parse(input);

    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(invoices)
        .where(
          and(eq(invoices.id, validated.invoiceId), isNull(invoices.deletedAt)),
        )
        .limit(1);
      if (!existing) throw new NotFoundError("Invoice not found");

      if (existing.status === "VOID") {
        throw new ConflictError("Void invoices cannot change status.");
      }

      const updates: Record<string, unknown> = {
        status: validated.status,
        updatedAt: new Date(),
      };
      if (validated.status === "SENT" && !existing.sentAt) {
        updates.sentAt = new Date();
      }
      if (validated.status === "PAID") {
        updates.paidAt = validated.paidAt
          ? new Date(validated.paidAt)
          : new Date();
      }
      if (validated.status !== "PAID" && existing.paidAt) {
        // moving back away from paid clears the timestamp so the audit log is honest
        updates.paidAt = null;
      }

      const [updated] = await tx
        .update(invoices)
        .set(updates)
        .where(eq(invoices.id, validated.invoiceId))
        .returning();
      if (!updated) throw new Error("Failed to update invoice status");

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "invoice.status.updated",
          entityType: ENTITY,
          entityId: updated.id,
          metadata: { from: existing.status, to: validated.status },
        },
        tx,
      );

      return updated;
    });
  },

  /**
   * Drafts a new invoice from a single tutoring session. Pulls the parent /
   * student / tutor info, computes the line item from the tutor's hourly
   * rate (or 0 when missing), and returns the freshly inserted invoice.
   *
   * The invoice is created in DRAFT — operators always review before send.
   */
  async createDraftFromSession(
    args: { sessionId: string; currency?: string; taxCents?: number },
    opts: { actor: Actor },
  ): Promise<InvoiceWithLineItems> {
    const taxCents = args.taxCents ?? 0;
    const currency = args.currency ?? "CAD";

    return db.transaction(async (tx) => {
      const [session] = await tx
        .select()
        .from(tutoringSessions)
        .where(
          and(
            eq(tutoringSessions.id, args.sessionId),
            isNull(tutoringSessions.deletedAt),
          ),
        )
        .limit(1);
      if (!session) throw new NotFoundError("Session not found");

      const [student] = await tx
        .select()
        .from(students)
        .where(
          and(eq(students.id, session.studentId), isNull(students.deletedAt)),
        )
        .limit(1);
      if (!student) throw new ValidationError("Student missing for session");

      const [parent] = await tx
        .select()
        .from(parents)
        .where(and(eq(parents.id, student.parentId), isNull(parents.deletedAt)))
        .limit(1);
      if (!parent) throw new ValidationError("Parent missing for student");

      const [tutor] = await tx
        .select()
        .from(tutors)
        .where(and(eq(tutors.id, session.tutorId), isNull(tutors.deletedAt)))
        .limit(1);

      // Charge: hourly rate * minutes / 60, rounded to nearest cent. Falls
      // back to a single-line "1.00" charge at $0 when the tutor lacks a rate
      // — operator must edit before sending.
      const hourlyRateCents = tutor?.hourlyRateCents ?? 0;
      const unitCentsPerMinute = hourlyRateCents / 60;
      const amountCents = Math.round(
        unitCentsPerMinute * session.durationMinutes,
      );
      const description = `${tutor?.fullName ?? "Tutoring"} · ${session.subject} · ${session.durationMinutes} min`;

      let invoiceNumber = await generateInvoiceNumber(tx);
      let inserted: Invoice | undefined;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const row: NewInvoice = {
          invoiceNumber,
          parentId: parent.id,
          studentId: student.id,
          status: "DRAFT",
          currency,
          subtotalCents: amountCents,
          taxCents,
          totalCents: amountCents + taxCents,
        };
        try {
          const result = await tx.insert(invoices).values(row).returning();
          inserted = result[0];
          break;
        } catch (err) {
          if (
            err &&
            typeof err === "object" &&
            "code" in err &&
            (err as { code?: string }).code === "23505"
          ) {
            invoiceNumber = await generateInvoiceNumber(tx);
            continue;
          }
          throw err;
        }
      }
      if (!inserted) {
        throw new ConflictError(
          "Could not allocate a unique invoice number; try again.",
        );
      }

      const lineRow: NewInvoiceLineItem = {
        invoiceId: inserted.id,
        description,
        quantity: 1,
        unitCents: amountCents,
        amountCents,
        sessionId: session.id,
      };
      const items = await tx
        .insert(invoiceLineItems)
        .values([lineRow])
        .returning();

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "invoice.draftedFromSession",
          entityType: ENTITY,
          entityId: inserted.id,
          metadata: {
            sessionId: session.id,
            parentId: parent.id,
            invoiceNumber: inserted.invoiceNumber,
            totalCents: inserted.totalCents,
          },
        },
        tx,
      );

      return { ...inserted, lineItems: items };
    });
  },

  async softDelete(id: string, opts: { actor: Actor }): Promise<void> {
    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(invoices)
        .where(and(eq(invoices.id, id), isNull(invoices.deletedAt)))
        .limit(1);
      if (!existing) throw new NotFoundError("Invoice not found");

      if (existing.status === "PAID") {
        throw new ConflictError(
          "Paid invoices cannot be deleted. Void them instead.",
        );
      }

      await tx
        .update(invoices)
        .set({ deletedAt: new Date() })
        .where(eq(invoices.id, id));

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "invoice.deleted",
          entityType: ENTITY,
          entityId: id,
        },
        tx,
      );
    });
  },
};
