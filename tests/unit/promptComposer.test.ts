import { describe, expect, it } from "vitest";

import { composeSystemPrompt } from "@/lib/ai/promptComposer";

import type { AgentKnowledgeDocument, OrgProfile } from "@/lib/db/schema";

const baseProfile: OrgProfile = {
  id: "default",
  companyName: "Lumen Tutoring",
  about: "We tutor grades 1-12 in Quebec.",
  voiceTone: "warm, parent-friendly, plain English",
  brandGuidelines: "Avoid jargon. Sign emails 'Lumen team'.",
  businessHours: "Mon-Fri 9-18 ET",
  defaultCurrency: "CAD",
  defaultTimezone: "America/Montreal",
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeDoc(
  overrides: Partial<AgentKnowledgeDocument> = {},
): AgentKnowledgeDocument {
  const now = new Date();
  return {
    id: "00000000-0000-4000-8000-000000000001",
    title: "Pricing",
    content: "Standard rate is $40/hour CAD.",
    tags: ["pricing"],
    agentScopes: ["*"],
    enabled: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

describe("composeSystemPrompt", () => {
  it("includes universal preamble + safety + agent body when no extras", () => {
    const out = composeSystemPrompt({
      agentName: "leadScoring",
      inCodeSystemPrompt: "AGENT_BODY",
      override: null,
      orgProfile: null,
      knowledge: [],
    });
    expect(out).toContain("You are an AI operations agent inside TutorOS AI");
    expect(out).toContain("Safety reminders");
    expect(out).toContain("AGENT_BODY");
    expect(out).not.toContain("<org_context>");
    expect(out).not.toContain("<knowledge>");
  });

  it("renders org profile into <org_context>", () => {
    const out = composeSystemPrompt({
      agentName: "leadScoring",
      inCodeSystemPrompt: "AGENT_BODY",
      override: null,
      orgProfile: baseProfile,
      knowledge: [],
    });
    expect(out).toContain("<org_context>");
    expect(out).toContain("Company: Lumen Tutoring");
    expect(out).toContain("Voice and tone: warm, parent-friendly");
    expect(out).toContain("Default timezone: America/Montreal");
    expect(out).toContain("</org_context>");
  });

  it("skips empty org fields gracefully", () => {
    const out = composeSystemPrompt({
      agentName: "leadScoring",
      inCodeSystemPrompt: "AGENT_BODY",
      override: null,
      orgProfile: {
        ...baseProfile,
        companyName: "",
        about: "",
        voiceTone: "",
        brandGuidelines: "",
        businessHours: "",
        defaultCurrency: "",
        defaultTimezone: "",
      },
      knowledge: [],
    });
    expect(out).not.toContain("<org_context>");
  });

  it("renders knowledge docs in order", () => {
    const out = composeSystemPrompt({
      agentName: "leadScoring",
      inCodeSystemPrompt: "AGENT_BODY",
      override: null,
      orgProfile: null,
      knowledge: [
        makeDoc({ title: "Pricing", content: "Rate: $40/h." }),
        makeDoc({ title: "Refund policy", content: "Refunds within 7 days." }),
      ],
    });
    expect(out).toContain("<knowledge>");
    expect(out).toContain("## Pricing");
    expect(out).toContain("## Refund policy");
    const pricingIdx = out.indexOf("## Pricing");
    const refundIdx = out.indexOf("## Refund policy");
    expect(pricingIdx).toBeLessThan(refundIdx);
  });

  it("uses operator override instead of in-code prompt when provided", () => {
    const out = composeSystemPrompt({
      agentName: "leadScoring",
      inCodeSystemPrompt: "DEFAULT_BODY",
      override: "OVERRIDE_BODY",
      orgProfile: null,
      knowledge: [],
    });
    expect(out).toContain("OVERRIDE_BODY");
    expect(out).not.toContain("DEFAULT_BODY");
  });

  it("treats blank override as 'use the in-code default'", () => {
    const out = composeSystemPrompt({
      agentName: "leadScoring",
      inCodeSystemPrompt: "DEFAULT_BODY",
      override: "   \n  ",
      orgProfile: null,
      knowledge: [],
    });
    expect(out).toContain("DEFAULT_BODY");
  });

  it("knowledge budget caps the injected docs", () => {
    const huge = "x".repeat(5_000);
    const out = composeSystemPrompt({
      agentName: "leadScoring",
      inCodeSystemPrompt: "AGENT_BODY",
      override: null,
      orgProfile: null,
      knowledge: [
        makeDoc({ title: "A", content: huge }),
        makeDoc({ title: "B", content: huge }),
        makeDoc({ title: "C", content: huge }),
      ],
    });
    expect(out).toContain("## A");
    expect(out).toContain("## B");
    expect(out).not.toContain("## C");
  });
});
