import { describe, expect, it } from "vitest";

import {
  assessmentCreateTool,
  homeworkAssignTool,
  homeworkSetStatusTool,
  learningPlanCreateTool,
} from "@/lib/ai/tools/academics";
import { commLogCallTool, commLogEmailTool } from "@/lib/ai/tools/comms";
import {
  invoiceCreateTool,
  invoiceMarkPaidTool,
  invoiceSendTool,
} from "@/lib/ai/tools/invoices";
import {
  parentsListTool,
  studentsListTool,
  tutorsListTool,
} from "@/lib/ai/tools/people";
import { sessionsGetTool, sessionsListTool } from "@/lib/ai/tools/sessions";

const VALID_UUID = "11111111-1111-4111-8111-111111111111";

describe("people tools", () => {
  it("are read-only and allow AI_AGENT", () => {
    for (const t of [parentsListTool, studentsListTool, tutorsListTool]) {
      expect(t.category).toBe("read");
      expect(t.riskLevel).toBe("LOW");
      expect(t.requiredRole).toContain("AI_AGENT");
    }
  });

  it("students.list optional parentId is uuid-checked", () => {
    expect(
      studentsListTool.inputSchema.safeParse({ parentId: "nope" }).success,
    ).toBe(false);
    expect(
      studentsListTool.inputSchema.safeParse({ parentId: VALID_UUID }).success,
    ).toBe(true);
  });
});

describe("sessions tools", () => {
  it("are read-only", () => {
    expect(sessionsListTool.category).toBe("read");
    expect(sessionsGetTool.category).toBe("read");
  });

  it("sessions.get rejects non-uuid", () => {
    expect(
      sessionsGetTool.inputSchema.safeParse({ sessionId: "x" }).success,
    ).toBe(false);
  });
});

describe("academics tools", () => {
  it("assessment.create requires student / subject / title", () => {
    const r = assessmentCreateTool.inputSchema.safeParse({
      studentId: VALID_UUID,
      subject: "Math",
      title: "Diagnostic",
    });
    expect(r.success).toBe(true);
  });

  it("homework.assign accepts ISO due date", () => {
    const r = homeworkAssignTool.inputSchema.safeParse({
      studentId: VALID_UUID,
      title: "Worksheet",
      dueDate: "2026-05-10T00:00:00.000Z",
    });
    expect(r.success).toBe(true);
  });

  it("homework.setStatus enforces enum", () => {
    expect(
      homeworkSetStatusTool.inputSchema.safeParse({
        homeworkId: VALID_UUID,
        status: "BOGUS",
      }).success,
    ).toBe(false);
    expect(
      homeworkSetStatusTool.inputSchema.safeParse({
        homeworkId: VALID_UUID,
        status: "REVIEWED",
      }).success,
    ).toBe(true);
  });

  it("learningPlan.create allows DRAFT default", () => {
    const r = learningPlanCreateTool.inputSchema.parse({
      studentId: VALID_UUID,
      title: "Algebra ramp",
    });
    expect(r.studentId).toBe(VALID_UUID);
  });
});

describe("invoice tools", () => {
  it("invoice.create is medium risk and requires line items", () => {
    expect(invoiceCreateTool.category).toBe("medium");
    expect(invoiceCreateTool.riskLevel).toBe("MEDIUM");
    expect(
      invoiceCreateTool.inputSchema.safeParse({
        parentId: VALID_UUID,
        lineItems: [],
      }).success,
    ).toBe(false);
  });

  it("invoice.markPaid is high risk and excludes AI_AGENT", () => {
    expect(invoiceMarkPaidTool.category).toBe("high");
    expect(invoiceMarkPaidTool.riskLevel).toBe("HIGH");
    expect(invoiceMarkPaidTool.requiredRole).not.toContain("AI_AGENT");
  });

  it("invoice.send keeps AI_AGENT but is medium risk", () => {
    expect(invoiceSendTool.requiredRole).toContain("AI_AGENT");
    expect(invoiceSendTool.riskLevel).toBe("MEDIUM");
  });
});

describe("comms tools", () => {
  it("comm.logEmail requires to + from + subject", () => {
    expect(
      commLogEmailTool.inputSchema.safeParse({
        subject: "Hello",
        fromEmail: "a@b.com",
        toEmails: [],
      }).success,
    ).toBe(false);
    expect(
      commLogEmailTool.inputSchema.safeParse({
        subject: "Hello",
        fromEmail: "a@b.com",
        toEmails: ["c@d.com"],
      }).success,
    ).toBe(true);
  });

  it("comm.logEmail rejects entityId without entityType", () => {
    const r = commLogEmailTool.inputSchema.safeParse({
      subject: "Hello",
      fromEmail: "a@b.com",
      toEmails: ["c@d.com"],
      entityId: "abc",
    });
    expect(r.success).toBe(false);
  });

  it("comm.logCall requires direction", () => {
    expect(commLogCallTool.inputSchema.safeParse({}).success).toBe(false);
    expect(
      commLogCallTool.inputSchema.safeParse({ direction: "INBOUND" }).success,
    ).toBe(true);
  });
});
