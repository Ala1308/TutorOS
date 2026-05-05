import { describe, expect, it } from "vitest";

import { eventSchemas } from "@/lib/inngest/events";

import type { EventName } from "@/lib/inngest/events";

/**
 * Contract tests for the Inngest event registry. Catching shape drift here
 * avoids `step.waitForEvent` mismatches and "send succeeded but consumer
 * never woke up" bugs at runtime.
 */
describe("eventSchemas", () => {
  it("every entry uses dot.case, lower case, no spaces", () => {
    for (const name of Object.keys(eventSchemas)) {
      expect(name).toMatch(/^[a-z][a-z0-9._]+[a-z0-9]$/);
      expect(name).toContain(".");
    }
  });

  it("every entry has a Zod schema under .data (Inngest fromZod contract)", () => {
    for (const [name, def] of Object.entries(eventSchemas)) {
      expect(def, `${name} missing definition`).toBeDefined();
      expect(
        "data" in def,
        `${name} must have a .data property (Inngest EventSchemas.fromZod)`,
      ).toBe(true);
      expect(typeof def.data.parse, `${name}.data must be a Zod schema`).toBe(
        "function",
      );
    }
  });

  it("approval.* events all carry an approvalId UUID", () => {
    const approvalEvents = [
      "approval.approved",
      "approval.rejected",
      "approval.changes_requested",
    ] as const satisfies ReadonlyArray<EventName>;

    for (const name of approvalEvents) {
      const result = eventSchemas[name].data.safeParse({
        approvalId: "00000000-0000-4000-8000-000000000000",
      });
      expect(result.success, `${name} should accept a uuid approvalId`).toBe(
        true,
      );

      const bad = eventSchemas[name].data.safeParse({ approvalId: "nope" });
      expect(bad.success, `${name} should reject a non-uuid approvalId`).toBe(
        false,
      );
    }
  });

  it("lead.created carries a leadId UUID", () => {
    const ok = eventSchemas["lead.created"].data.safeParse({
      leadId: "00000000-0000-4000-8000-000000000000",
    });
    expect(ok.success).toBe(true);

    const bad = eventSchemas["lead.created"].data.safeParse({ leadId: 42 });
    expect(bad.success).toBe(false);
  });

  it("lead.qualified requires leadId AND score", () => {
    const ok = eventSchemas["lead.qualified"].data.safeParse({
      leadId: "00000000-0000-4000-8000-000000000000",
      score: 85,
    });
    expect(ok.success).toBe(true);

    const missingScore = eventSchemas["lead.qualified"].data.safeParse({
      leadId: "00000000-0000-4000-8000-000000000000",
    });
    expect(missingScore.success).toBe(false);
  });

  it("daily.tick has an empty payload", () => {
    expect(eventSchemas["daily.tick"].data.safeParse({}).success).toBe(true);
  });

  it("registry contains every event name CONTRIBUTING.md mentions", () => {
    // Sanity floor — if anyone deletes one of these the workflow code that
    // subscribes to it will compile-fail, but this guards against silent
    // schema removal too.
    const required: EventName[] = [
      "lead.created",
      "lead.qualified",
      "approval.approved",
      "approval.rejected",
      "approval.changes_requested",
      "agent.run.completed",
      "daily.tick",
    ];
    for (const name of required) {
      expect(name in eventSchemas, `missing event ${name}`).toBe(true);
    }
  });
});
