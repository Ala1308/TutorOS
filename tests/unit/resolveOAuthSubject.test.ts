import { describe, expect, it } from "vitest";

import type { ToolContext } from "@/lib/ai/types";
import { resolveGoogleOAuthSubject } from "@/lib/google/resolveOAuthSubject";
import { ForbiddenError, ValidationError } from "@/lib/utils/errors";

const ownerUser = {
  type: "USER" as const,
  id: "11111111-1111-4111-8111-111111111111",
  role: "OWNER" as const,
  email: "o@example.com",
};

const systemActor = { type: "SYSTEM" as const, id: "system" };

const agentActor = {
  type: "AGENT" as const,
  id: "agent-1",
  agentName: "test",
  agentRunId: "run-1",
};

describe("resolveGoogleOAuthSubject", () => {
  it("returns USER id for USER actors", () => {
    const ctx: ToolContext = { actor: ownerUser };
    expect(resolveGoogleOAuthSubject(ctx)).toBe(ownerUser.id);
  });

  it("allows USER with matching googleOAuthUserId", () => {
    const ctx: ToolContext = {
      actor: ownerUser,
      googleOAuthUserId: ownerUser.id,
    };
    expect(resolveGoogleOAuthSubject(ctx)).toBe(ownerUser.id);
  });

  it("rejects USER spoofing another googleOAuthUserId", () => {
    const ctx: ToolContext = {
      actor: ownerUser,
      googleOAuthUserId: "22222222-2222-4222-8222-222222222222",
    };
    expect(() => resolveGoogleOAuthSubject(ctx)).toThrow(ForbiddenError);
  });

  it("requires uuid googleOAuthUserId for SYSTEM", () => {
    expect(
      resolveGoogleOAuthSubject({
        actor: systemActor,
        googleOAuthUserId: ownerUser.id,
      }),
    ).toBe(ownerUser.id);
    expect(() => resolveGoogleOAuthSubject({ actor: systemActor })).toThrow(
      ValidationError,
    );
    expect(() =>
      resolveGoogleOAuthSubject({
        actor: systemActor,
        googleOAuthUserId: "not-a-uuid",
      }),
    ).toThrow(ValidationError);
  });

  it("requires uuid googleOAuthUserId for AGENT", () => {
    expect(
      resolveGoogleOAuthSubject({
        actor: agentActor,
        googleOAuthUserId: ownerUser.id,
      }),
    ).toBe(ownerUser.id);
    expect(() => resolveGoogleOAuthSubject({ actor: agentActor })).toThrow(
      ValidationError,
    );
  });
});
