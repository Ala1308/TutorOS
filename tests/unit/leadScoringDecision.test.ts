import { describe, expect, it } from "vitest";

import {
  decideLeadScoringOutcome,
  type LeadScoringScorePayload,
} from "@/lib/services/leadScoringService";

import type { AutomationLevel } from "@/lib/ai/types";

const payload: LeadScoringScorePayload = {
  score: 72,
  riskLevel: "LOW",
  riskFlags: [],
  reasoning: "ok",
};

function decide(args: { agentSaysApproval: boolean; mode: AutomationLevel }) {
  return decideLeadScoringOutcome({ ...args, payload });
}

describe("decideLeadScoringOutcome", () => {
  it("MANUAL always blocks", () => {
    expect(decide({ agentSaysApproval: false, mode: "MANUAL" })).toEqual({
      kind: "BLOCKED_MANUAL",
    });
    expect(decide({ agentSaysApproval: true, mode: "MANUAL" })).toEqual({
      kind: "BLOCKED_MANUAL",
    });
  });

  it("FULL_AUTO + agent OK → APPLY", () => {
    const r = decide({ agentSaysApproval: false, mode: "FULL_AUTO" });
    expect(r.kind).toBe("APPLY");
    if (r.kind === "APPLY") expect(r.payload).toBe(payload);
  });

  it("FULL_AUTO + agent wants approval → APPROVAL with agent reason", () => {
    const r = decide({ agentSaysApproval: true, mode: "FULL_AUTO" });
    expect(r.kind).toBe("APPROVAL");
    if (r.kind === "APPROVAL") {
      expect(r.reason).toBe("agent_low_confidence_or_high_risk");
      expect(r.payload).toBe(payload);
    }
  });

  it("DRAFT_ONLY always raises approval", () => {
    const r1 = decide({ agentSaysApproval: false, mode: "DRAFT_ONLY" });
    expect(r1.kind).toBe("APPROVAL");
    if (r1.kind === "APPROVAL") expect(r1.reason).toBe("automation_draft_only");

    const r2 = decide({ agentSaysApproval: true, mode: "DRAFT_ONLY" });
    expect(r2.kind).toBe("APPROVAL");
    if (r2.kind === "APPROVAL") {
      // agent reason wins when both apply — gives operators clearer signal
      expect(r2.reason).toBe("agent_low_confidence_or_high_risk");
    }
  });

  it("AUTO_AFTER_APPROVAL always raises approval", () => {
    const r = decide({ agentSaysApproval: false, mode: "AUTO_AFTER_APPROVAL" });
    expect(r.kind).toBe("APPROVAL");
    if (r.kind === "APPROVAL") {
      expect(r.reason).toBe("automation_auto_after_approval");
    }
  });
});
