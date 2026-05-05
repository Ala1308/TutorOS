import { describe, expect, it } from "vitest";

import {
  parentCreateSchema,
  parentUpdateSchema,
  splitCsv,
  studentCreateSchema,
  studentUpdateSchema,
  tutorCreateSchema,
  tutorStatusUpdateSchema,
} from "@/lib/schemas/people";

describe("splitCsv", () => {
  it("trims, dedupes, drops empties", () => {
    expect(splitCsv("Math, Physics ,  ,Math")).toEqual(["Math", "Physics"]);
  });

  it("returns [] for null/undefined/empty", () => {
    expect(splitCsv(null)).toEqual([]);
    expect(splitCsv(undefined)).toEqual([]);
    expect(splitCsv("")).toEqual([]);
  });
});

describe("parentCreateSchema", () => {
  it("requires fullName + email", () => {
    expect(parentCreateSchema.safeParse({}).success).toBe(false);
    expect(
      parentCreateSchema.safeParse({
        fullName: "Marie",
        email: "marie@example.com",
      }).success,
    ).toBe(true);
  });

  it("rejects bad email", () => {
    const r = parentCreateSchema.safeParse({
      fullName: "Marie",
      email: "not-an-email",
    });
    expect(r.success).toBe(false);
  });

  it("converts blank optional strings to undefined", () => {
    const r = parentCreateSchema.parse({
      fullName: "Marie",
      email: "marie@example.com",
      phone: "",
      timezone: "",
      notes: "",
    });
    expect(r.phone).toBeUndefined();
    expect(r.timezone).toBeUndefined();
    expect(r.notes).toBeUndefined();
  });
});

describe("parentUpdateSchema", () => {
  it("accepts a single field", () => {
    expect(parentUpdateSchema.safeParse({ phone: "555" }).success).toBe(true);
  });
});

describe("studentCreateSchema", () => {
  it("requires parentId + names", () => {
    const r = studentCreateSchema.safeParse({
      parentId: "11111111-1111-4111-8111-111111111111",
      firstName: "A",
      lastName: "B",
    });
    expect(r.success).toBe(true);
  });

  it("rejects missing parentId", () => {
    const r = studentCreateSchema.safeParse({
      firstName: "A",
      lastName: "B",
    });
    expect(r.success).toBe(false);
  });

  it("update schema does not allow parentId", () => {
    const r = studentUpdateSchema.safeParse({
      parentId: "11111111-1111-4111-8111-111111111111",
    });
    expect(r.success).toBe(true); // unknown keys are stripped, not rejected
    if (r.success) expect("parentId" in r.data).toBe(false);
  });
});

describe("tutorCreateSchema", () => {
  it("defaults status to APPLIED", () => {
    const r = tutorCreateSchema.parse({
      fullName: "Alex",
      email: "alex@example.com",
    });
    expect(r.status).toBe("APPLIED");
  });

  it("rejects negative hourly rate", () => {
    const r = tutorCreateSchema.safeParse({
      fullName: "Alex",
      email: "alex@example.com",
      hourlyRateCents: -1,
    });
    expect(r.success).toBe(false);
  });
});

describe("tutorStatusUpdateSchema", () => {
  it("requires uuid + valid status", () => {
    expect(
      tutorStatusUpdateSchema.safeParse({
        tutorId: "not-a-uuid",
        status: "ACTIVE",
      }).success,
    ).toBe(false);
    expect(
      tutorStatusUpdateSchema.safeParse({
        tutorId: "11111111-1111-4111-8111-111111111111",
        status: "ACTIVE",
      }).success,
    ).toBe(true);
  });

  it("rejects unknown status", () => {
    expect(
      tutorStatusUpdateSchema.safeParse({
        tutorId: "11111111-1111-4111-8111-111111111111",
        status: "FIRED",
      }).success,
    ).toBe(false);
  });
});
