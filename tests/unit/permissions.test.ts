import { describe, expect, it } from "vitest";

import { can, ensure } from "@/lib/auth/permissions";
import { ForbiddenError } from "@/lib/utils/errors";

import type { Actor, UserRole } from "@/lib/auth/types";

const user = (role: UserRole): Actor => ({
  type: "USER",
  id: "u1",
  role,
  email: "u@example.com",
});

const SYSTEM: Actor = { type: "SYSTEM", id: "sys" };
const AGENT: Actor = {
  type: "AGENT",
  id: "agt",
  agentName: "leadScoring",
  agentRunId: "r1",
};

describe("permissions matrix", () => {
  it("OWNER and ADMIN can do everything in the matrix", () => {
    for (const role of ["OWNER", "ADMIN"] as const) {
      const a = user(role);
      expect(can(a, "lead.create")).toBe(true);
      expect(can(a, "lead.delete")).toBe(true);
      expect(can(a, "approval.resolve")).toBe(true);
      expect(can(a, "audit.read")).toBe(true);
      expect(can(a, "automation.update")).toBe(true);
    }
  });

  it("ACADEMIC_MANAGER can run and read but cannot resolve approvals", () => {
    const a = user("ACADEMIC_MANAGER");
    expect(can(a, "lead.create")).toBe(true);
    expect(can(a, "agent.run")).toBe(true);
    expect(can(a, "approval.resolve")).toBe(false);
    expect(can(a, "audit.read")).toBe(false);
  });

  it("TUTOR cannot read leads", () => {
    expect(can(user("TUTOR"), "lead.read")).toBe(false);
  });

  it("PARENT can only see student-scoped reads", () => {
    const a = user("PARENT");
    expect(can(a, "student.read")).toBe(true);
    expect(can(a, "session.read")).toBe(true);
    expect(can(a, "lead.read")).toBe(false);
    expect(can(a, "tutor.read")).toBe(false);
  });

  it("SYSTEM bypasses all checks", () => {
    expect(can(SYSTEM, "audit.read")).toBe(true);
    expect(can(SYSTEM, "lead.delete")).toBe(true);
    expect(can(SYSTEM, "approval.resolve")).toBe(true);
  });

  it("AGENT can act broadly but never resolve approvals or change automation", () => {
    expect(can(AGENT, "lead.create")).toBe(true);
    expect(can(AGENT, "lead.score")).toBe(true);
    expect(can(AGENT, "approval.resolve")).toBe(false);
    expect(can(AGENT, "automation.update")).toBe(false);
    expect(can(AGENT, "lead.delete")).toBe(false);
  });
});

describe("ensure", () => {
  it("throws ForbiddenError when not allowed", () => {
    expect(() => ensure(user("TUTOR"), "lead.read")).toThrow(ForbiddenError);
  });
  it("returns void when allowed", () => {
    expect(() => ensure(user("OWNER"), "lead.read")).not.toThrow();
  });
});
