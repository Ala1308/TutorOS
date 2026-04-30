import { describe, expect, it } from "vitest";

import {
  AgentExecutionError,
  AppError,
  ConflictError,
  ConsentBlockedError,
  ExternalServiceError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/utils/errors";

describe("errors", () => {
  it("AppError sets code and status", () => {
    const e = new AppError("boom");
    expect(e.code).toBe("APP_ERROR");
    expect(e.status).toBe(500);
    expect(e.message).toBe("boom");
    expect(e).toBeInstanceOf(Error);
  });

  it("typed errors have the right HTTP status", () => {
    expect(new ValidationError().status).toBe(400);
    expect(new UnauthorizedError().status).toBe(401);
    expect(new ForbiddenError().status).toBe(403);
    expect(new NotFoundError().status).toBe(404);
    expect(new ConflictError().status).toBe(409);
    expect(new ConsentBlockedError("DATA_PROCESSING").status).toBe(403);
    expect(new ExternalServiceError("google", "down").status).toBe(502);
    expect(new AgentExecutionError("leadScoring", "x").status).toBe(500);
  });

  it("ConsentBlockedError carries the consent type", () => {
    const e = new ConsentBlockedError("EMAIL_COMMUNICATION");
    expect(e.consentType).toBe("EMAIL_COMMUNICATION");
    expect(e.code).toBe("CONSENT_BLOCKED");
  });

  it("ExternalServiceError carries the service name", () => {
    expect(new ExternalServiceError("voice", "rate limit").service).toBe(
      "voice",
    );
  });

  it("AgentExecutionError carries the agent name", () => {
    expect(new AgentExecutionError("intake", "timeout").agentName).toBe(
      "intake",
    );
  });

  it("ValidationError accepts details", () => {
    const e = new ValidationError("nope", { field: "email" });
    expect(e.details).toEqual({ field: "email" });
  });
});
