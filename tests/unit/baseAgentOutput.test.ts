import { describe, expect, it } from "vitest";

import { baseAgentOutput } from "@/lib/ai/schemas/_base";

const valid = {
  confidence: 0.8,
  riskLevel: "LOW",
  riskFlags: ["minor_subject"],
  reasoning: "ok",
  requiresHumanApproval: false,
};

describe("baseAgentOutput", () => {
  it("accepts a valid base output", () => {
    expect(baseAgentOutput.safeParse(valid).success).toBe(true);
  });

  it("rejects confidence outside 0..1", () => {
    expect(
      baseAgentOutput.safeParse({ ...valid, confidence: 1.5 }).success,
    ).toBe(false);
    expect(
      baseAgentOutput.safeParse({ ...valid, confidence: -0.1 }).success,
    ).toBe(false);
  });

  it("rejects unknown risk levels", () => {
    expect(
      baseAgentOutput.safeParse({ ...valid, riskLevel: "EXTREME" }).success,
    ).toBe(false);
  });

  it("defaults riskFlags to []", () => {
    const { riskFlags: _omitted, ...withoutFlags } = valid;
    const parsed = baseAgentOutput.parse(withoutFlags);
    expect(parsed.riskFlags).toEqual([]);
  });

  it("requires reasoning to be non-empty", () => {
    expect(baseAgentOutput.safeParse({ ...valid, reasoning: "" }).success).toBe(
      false,
    );
  });

  it("approvalReason is optional", () => {
    expect(baseAgentOutput.safeParse(valid).success).toBe(true);
    expect(
      baseAgentOutput.safeParse({
        ...valid,
        requiresHumanApproval: true,
        approvalReason: "missing input",
      }).success,
    ).toBe(true);
  });
});
