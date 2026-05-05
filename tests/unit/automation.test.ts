import { describe, expect, it } from "vitest";

import {
  AUTOMATION_MODES,
  DEFAULT_AUTOMATION_MODE,
  HIGH_RISK_STEPS,
  WORKFLOW_STEPS,
  isHighRiskStep,
} from "@/lib/services/automationService";

describe("automation constants", () => {
  it("default mode is DRAFT_ONLY (CONTRIBUTING.md §15)", () => {
    expect(DEFAULT_AUTOMATION_MODE).toBe("DRAFT_ONLY");
  });

  it("AUTOMATION_MODES covers the four canonical modes", () => {
    expect([...AUTOMATION_MODES].sort()).toEqual([
      "AUTO_AFTER_APPROVAL",
      "DRAFT_ONLY",
      "FULL_AUTO",
      "MANUAL",
    ]);
  });

  it("HIGH_RISK_STEPS only contains keys that exist in WORKFLOW_STEPS", () => {
    const allKeys = new Set<string>(
      Object.values(WORKFLOW_STEPS).flatMap((d) => Object.values(d)),
    );
    for (const k of HIGH_RISK_STEPS) {
      expect(allKeys.has(k)).toBe(true);
    }
  });

  it("known high-risk steps are flagged", () => {
    // Anything that physically sends to a third party / charges money.
    expect(isHighRiskStep(WORKFLOW_STEPS.lead.acknowledgmentEmail)).toBe(true);
    expect(isHighRiskStep(WORKFLOW_STEPS.assessment.sendToStudent)).toBe(true);
    expect(isHighRiskStep(WORKFLOW_STEPS.tutor.assignment)).toBe(true);
    expect(isHighRiskStep(WORKFLOW_STEPS.invoice.send)).toBe(true);
    expect(isHighRiskStep(WORKFLOW_STEPS.payout.finalize)).toBe(true);
  });

  it("internal-only steps are not flagged high-risk", () => {
    expect(isHighRiskStep(WORKFLOW_STEPS.lead.scoring)).toBe(false);
    expect(isHighRiskStep(WORKFLOW_STEPS.assessment.generation)).toBe(false);
    expect(isHighRiskStep(WORKFLOW_STEPS.session.prepGeneration)).toBe(false);
    expect(isHighRiskStep(WORKFLOW_STEPS.invoice.generation)).toBe(false);
  });

  it("isHighRiskStep returns false for unknown keys", () => {
    expect(isHighRiskStep("nonsense.step")).toBe(false);
  });
});
