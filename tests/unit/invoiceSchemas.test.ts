import { describe, expect, it } from "vitest";

import {
  invoiceCreateSchema,
  invoiceStatusSchema,
  invoiceUpdateSchema,
} from "../../lib/schemas/invoices";

const PARENT = "11111111-1111-1111-1111-111111111111";
const STUDENT = "22222222-2222-2222-2222-222222222222";

describe("invoiceCreateSchema", () => {
  it("accepts a minimal invoice with one line item", () => {
    const out = invoiceCreateSchema.parse({
      parentId: PARENT,
      lineItems: [{ description: "1h tutoring", quantity: 1, unitCents: 5000 }],
    });
    expect(out.currency).toBe("CAD");
    expect(out.taxCents).toBe(0);
    expect(out.lineItems[0]?.description).toBe("1h tutoring");
  });

  it("rejects when no line items", () => {
    expect(() =>
      invoiceCreateSchema.parse({
        parentId: PARENT,
        lineItems: [],
      }),
    ).toThrow();
  });

  it("rejects negative unit prices", () => {
    expect(() =>
      invoiceCreateSchema.parse({
        parentId: PARENT,
        lineItems: [{ description: "x", quantity: 1, unitCents: -500 }],
      }),
    ).toThrow();
  });

  it("accepts optional studentId and notes", () => {
    const out = invoiceCreateSchema.parse({
      parentId: PARENT,
      studentId: STUDENT,
      notes: "thanks!",
      taxCents: 250,
      lineItems: [{ description: "x", quantity: 2, unitCents: 1000 }],
    });
    expect(out.studentId).toBe(STUDENT);
    expect(out.notes).toBe("thanks!");
    expect(out.taxCents).toBe(250);
  });
});

describe("invoiceUpdateSchema", () => {
  it("allows omitting line items", () => {
    const out = invoiceUpdateSchema.parse({ taxCents: 100 });
    expect(out.taxCents).toBe(100);
    expect(out.lineItems).toBeUndefined();
  });

  it("requires at least one line item when provided", () => {
    expect(() => invoiceUpdateSchema.parse({ lineItems: [] })).toThrow();
  });
});

describe("invoiceStatusSchema", () => {
  it("accepts a paid transition with paidAt", () => {
    const out = invoiceStatusSchema.parse({
      invoiceId: PARENT,
      status: "PAID",
      paidAt: "2026-05-04T12:00:00Z",
    });
    expect(out.status).toBe("PAID");
    expect(out.paidAt).toBeTruthy();
  });

  it("rejects unknown statuses", () => {
    expect(() =>
      invoiceStatusSchema.parse({ invoiceId: PARENT, status: "WAT" }),
    ).toThrow();
  });
});
