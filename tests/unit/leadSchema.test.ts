import { describe, expect, it } from "vitest";

import { leadCreateSchema, leadUpdateStatusSchema } from "@/lib/schemas/lead";

describe("leadCreateSchema", () => {
  const base = {
    parentName: "Marie",
    parentEmail: "m@example.com",
    studentGrade: "Grade 9",
    subjectNeeded: "Math",
    consentDataProcessing: true,
  };

  it("accepts a minimal valid lead", () => {
    expect(leadCreateSchema.safeParse(base).success).toBe(true);
  });

  it("defaults source to WEBSITE", () => {
    expect(leadCreateSchema.parse(base).source).toBe("WEBSITE");
  });

  it("rejects bad emails", () => {
    expect(
      leadCreateSchema.safeParse({ ...base, parentEmail: "not-an-email" })
        .success,
    ).toBe(false);
  });

  it("rejects missing required fields", () => {
    expect(
      leadCreateSchema.safeParse({ ...base, parentName: "" }).success,
    ).toBe(false);
    expect(
      leadCreateSchema.safeParse({ ...base, subjectNeeded: "" }).success,
    ).toBe(false);
  });

  it("rejects unknown source enum", () => {
    expect(
      leadCreateSchema.safeParse({ ...base, source: "TIKTOK" }).success,
    ).toBe(false);
  });

  it("requires consentDataProcessing to be a boolean", () => {
    expect(
      leadCreateSchema.safeParse({ ...base, consentDataProcessing: undefined })
        .success,
    ).toBe(false);
  });

  it("caps message length", () => {
    const long = "x".repeat(5001);
    expect(leadCreateSchema.safeParse({ ...base, message: long }).success).toBe(
      false,
    );
  });
});

describe("leadUpdateStatusSchema", () => {
  it("accepts valid status transitions", () => {
    expect(
      leadUpdateStatusSchema.safeParse({
        leadId: "00000000-0000-0000-0000-000000000000",
        status: "QUALIFIED",
      }).success,
    ).toBe(true);
  });

  it("rejects invalid status", () => {
    expect(
      leadUpdateStatusSchema.safeParse({
        leadId: "00000000-0000-0000-0000-000000000000",
        status: "WHATEVER",
      }).success,
    ).toBe(false);
  });

  it("rejects non-uuid leadId", () => {
    expect(
      leadUpdateStatusSchema.safeParse({ leadId: "abc", status: "NEW" })
        .success,
    ).toBe(false);
  });
});
