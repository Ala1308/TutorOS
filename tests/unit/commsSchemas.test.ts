import { describe, expect, it } from "vitest";

import { callLogSchema, emailLogSchema } from "../../lib/schemas/comms";

const PARENT_ID = "11111111-1111-1111-1111-111111111111";

describe("emailLogSchema", () => {
  it("accepts a minimal outbound email", () => {
    const out = emailLogSchema.parse({
      subject: "Welcome!",
      fromEmail: "ops@example.com",
      toEmails: ["parent@example.com"],
    });
    expect(out.direction).toBe("OUTBOUND");
    expect(out.toEmails).toEqual(["parent@example.com"]);
  });

  it("rejects an invalid email address", () => {
    expect(() =>
      emailLogSchema.parse({
        subject: "x",
        fromEmail: "not-an-email",
        toEmails: ["parent@example.com"],
      }),
    ).toThrow();
  });

  it("requires both entityType and entityId together", () => {
    expect(() =>
      emailLogSchema.parse({
        subject: "x",
        fromEmail: "a@b.com",
        toEmails: ["a@b.com"],
        entityType: "parent",
      }),
    ).toThrow(/entity/i);
  });

  it("accepts a fully linked email", () => {
    const out = emailLogSchema.parse({
      subject: "x",
      fromEmail: "a@b.com",
      toEmails: ["a@b.com"],
      entityType: "parent",
      entityId: PARENT_ID,
    });
    expect(out.entityType).toBe("parent");
    expect(out.entityId).toBe(PARENT_ID);
  });
});

describe("callLogSchema", () => {
  it("accepts a minimal outbound call", () => {
    const out = callLogSchema.parse({
      direction: "OUTBOUND",
      toNumber: "+15555550100",
    });
    expect(out.direction).toBe("OUTBOUND");
    expect(out.toNumber).toBe("+15555550100");
  });

  it("rejects an unknown outcome", () => {
    expect(() =>
      callLogSchema.parse({
        direction: "OUTBOUND",
        outcome: "WAT",
      }),
    ).toThrow();
  });

  it("clamps duration to a sane range", () => {
    expect(() =>
      callLogSchema.parse({
        direction: "INBOUND",
        durationSeconds: -5,
      }),
    ).toThrow();
    expect(() =>
      callLogSchema.parse({
        direction: "INBOUND",
        durationSeconds: 60 * 60 * 24,
      }),
    ).toThrow();
  });
});
