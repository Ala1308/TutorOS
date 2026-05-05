import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { defineTool, isApprovalRequired, runTool } from "@/lib/ai/toolRegistry";
import { ForbiddenError, ValidationError } from "@/lib/utils/errors";

import type { Actor } from "@/lib/auth/types";

vi.mock("@/lib/services/auditService", () => ({
  auditService: { logAuditEvent: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("@/lib/services/automationService", () => ({
  automationService: { getMode: vi.fn() },
}));

vi.mock("@/lib/services/approvalService", () => ({
  approvalService: { create: vi.fn() },
}));

const { automationService } = await import("@/lib/services/automationService");
const { approvalService } = await import("@/lib/services/approvalService");
const { auditService } = await import("@/lib/services/auditService");

const HUMAN_ACTOR: Actor = {
  type: "USER",
  id: "u1",
  role: "OWNER",
  email: "owner@example.com",
};
const AGENT_ACTOR: Actor = {
  type: "AGENT",
  id: "a1",
  agentName: "test-agent",
  agentRunId: "run-1",
};
const SYSTEM_ACTOR: Actor = { type: "SYSTEM", id: "sys" };

let counter = 0;
function makeTool(opts: {
  category: "read" | "low" | "medium" | "high" | "governance";
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  workflowStep?: string;
  handler?: (input: { value: number }) => Promise<{ value: number }>;
}) {
  counter += 1;
  return defineTool({
    name: `test.tool.${counter}`,
    description: "test tool",
    category: opts.category,
    inputSchema: z.object({ value: z.number().int() }),
    outputSchema: z.object({ value: z.number().int() }),
    requiredRole: ["OWNER", "ADMIN", "AI_AGENT"],
    riskLevel: opts.riskLevel,
    ...(opts.workflowStep ? { workflowStep: opts.workflowStep } : {}),
    handler: async (input) =>
      opts.handler ? opts.handler(input) : { value: input.value + 1 },
  });
}

afterEach(() => {
  vi.mocked(automationService.getMode).mockReset();
  vi.mocked(approvalService.create).mockReset();
  vi.mocked(auditService.logAuditEvent).mockClear();
});

describe("runTool — base flow", () => {
  it("rejects invalid input", async () => {
    const t = makeTool({ category: "read", riskLevel: "LOW" });
    await expect(
      runTool(t.name, { value: "x" }, { actor: HUMAN_ACTOR }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects actors without the required role", async () => {
    const tutorActor: Actor = {
      type: "USER",
      id: "u2",
      role: "TUTOR",
      email: "t@example.com",
    };
    const t = makeTool({ category: "read", riskLevel: "LOW" });
    await expect(
      runTool(t.name, { value: 1 }, { actor: tutorActor }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("returns parsed output on success and writes one audit row", async () => {
    const t = makeTool({ category: "read", riskLevel: "LOW" });
    const out = await runTool<{ value: number }, { value: number }>(
      t.name,
      { value: 1 },
      { actor: HUMAN_ACTOR },
    );
    expect(isApprovalRequired(out)).toBe(false);
    expect(out).toEqual({ value: 2 });
    expect(auditService.logAuditEvent).toHaveBeenCalledTimes(1);
  });
});

describe("runTool — gating for medium/high tools", () => {
  it("does NOT gate human (USER) callers — they are the approval", async () => {
    const t = makeTool({
      category: "medium",
      riskLevel: "MEDIUM",
      workflowStep: "test.gateMe",
    });
    const out = await runTool<{ value: number }, { value: number }>(
      t.name,
      { value: 1 },
      { actor: HUMAN_ACTOR },
    );
    expect(isApprovalRequired(out)).toBe(false);
    expect(automationService.getMode).not.toHaveBeenCalled();
  });

  it("does NOT gate SYSTEM callers (workflows that bypass)", async () => {
    const t = makeTool({
      category: "medium",
      riskLevel: "MEDIUM",
      workflowStep: "test.gateSystem",
    });
    const out = await runTool<{ value: number }, { value: number }>(
      t.name,
      { value: 1 },
      { actor: SYSTEM_ACTOR },
    );
    expect(isApprovalRequired(out)).toBe(false);
  });

  it("agent + DRAFT_ONLY → creates an approval and returns deferred result", async () => {
    vi.mocked(automationService.getMode).mockResolvedValue("DRAFT_ONLY");
    vi.mocked(approvalService.create).mockResolvedValue({
      id: "appr-1",
    } as never);

    const t = makeTool({
      category: "medium",
      riskLevel: "MEDIUM",
      workflowStep: "test.draftOnly",
    });
    const out = await runTool<{ value: number }, { value: number }>(
      t.name,
      { value: 1 },
      { actor: AGENT_ACTOR, googleOAuthUserId: "u1" },
    );
    expect(isApprovalRequired(out)).toBe(true);
    if (isApprovalRequired(out)) {
      expect(out.approvalId).toBe("appr-1");
      expect(out.workflowStep).toBe("test.draftOnly");
    }
    expect(approvalService.create).toHaveBeenCalledTimes(1);
  });

  it("agent + AUTO_AFTER_APPROVAL → also gated to approval", async () => {
    vi.mocked(automationService.getMode).mockResolvedValue(
      "AUTO_AFTER_APPROVAL",
    );
    vi.mocked(approvalService.create).mockResolvedValue({
      id: "appr-2",
    } as never);
    const t = makeTool({
      category: "medium",
      riskLevel: "MEDIUM",
      workflowStep: "test.autoApproval",
    });
    const out = await runTool(
      t.name,
      { value: 1 },
      {
        actor: AGENT_ACTOR,
        googleOAuthUserId: "u1",
      },
    );
    expect(isApprovalRequired(out)).toBe(true);
  });

  it("agent + FULL_AUTO on a medium tool → executes directly", async () => {
    vi.mocked(automationService.getMode).mockResolvedValue("FULL_AUTO");
    const t = makeTool({
      category: "medium",
      riskLevel: "MEDIUM",
      workflowStep: "test.fullAuto",
    });
    const out = await runTool<{ value: number }, { value: number }>(
      t.name,
      { value: 1 },
      { actor: AGENT_ACTOR, googleOAuthUserId: "u1" },
    );
    expect(isApprovalRequired(out)).toBe(false);
    expect(out).toEqual({ value: 2 });
    expect(approvalService.create).not.toHaveBeenCalled();
  });

  it("agent + FULL_AUTO on a HIGH-risk tool → forbidden", async () => {
    vi.mocked(automationService.getMode).mockResolvedValue("FULL_AUTO");
    const t = makeTool({
      category: "high",
      riskLevel: "HIGH",
      workflowStep: "test.highRisk",
    });
    await expect(
      runTool(
        t.name,
        { value: 1 },
        {
          actor: AGENT_ACTOR,
          googleOAuthUserId: "u1",
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("agent + MANUAL → forbidden, no approval", async () => {
    vi.mocked(automationService.getMode).mockResolvedValue("MANUAL");
    const t = makeTool({
      category: "medium",
      riskLevel: "MEDIUM",
      workflowStep: "test.manual",
    });
    await expect(
      runTool(
        t.name,
        { value: 1 },
        {
          actor: AGENT_ACTOR,
          googleOAuthUserId: "u1",
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(approvalService.create).not.toHaveBeenCalled();
  });

  it("agent on a tool without workflowStep → executes (no gate)", async () => {
    const t = makeTool({ category: "medium", riskLevel: "MEDIUM" });
    const out = await runTool<{ value: number }, { value: number }>(
      t.name,
      { value: 1 },
      { actor: AGENT_ACTOR, googleOAuthUserId: "u1" },
    );
    expect(isApprovalRequired(out)).toBe(false);
  });

  it("agent gate without ctx.googleOAuthUserId → forbidden", async () => {
    const t = makeTool({
      category: "medium",
      riskLevel: "MEDIUM",
      workflowStep: "test.noUser",
    });
    await expect(
      runTool(t.name, { value: 1 }, { actor: AGENT_ACTOR }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
