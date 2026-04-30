import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { logger } from "@/lib/logger";

/**
 * Typed error hierarchy. Throw these from services / routes / actions.
 * Catch them at trust boundaries; log full details server-side, return
 * sanitized messages client-side.
 */
export class AppError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = "APP_ERROR", status = 500) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
  }
}

export class ValidationError extends AppError {
  details?: unknown;
  constructor(message = "Validation failed", details?: unknown) {
    super(message, "VALIDATION_ERROR", 400);
    if (details !== undefined) this.details = details;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, "UNAUTHORIZED", 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, "FORBIDDEN", 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, "NOT_FOUND", 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(message, "CONFLICT", 409);
  }
}

export class ConsentBlockedError extends AppError {
  consentType: string;
  constructor(
    consentType: string,
    message = "Action blocked: missing consent",
  ) {
    super(message, "CONSENT_BLOCKED", 403);
    this.consentType = consentType;
  }
}

export class ExternalServiceError extends AppError {
  service: string;
  constructor(service: string, message: string) {
    super(message, "EXTERNAL_SERVICE_ERROR", 502);
    this.service = service;
  }
}

export class AgentExecutionError extends AppError {
  agentName: string;
  constructor(agentName: string, message: string) {
    super(message, "AGENT_EXECUTION_ERROR", 500);
    this.agentName = agentName;
  }
}

/** Centralised API error → JSON response handler. */
export function handleApiError(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    logger.warn({ err: err.flatten() }, "Validation error");
    return NextResponse.json(
      {
        ok: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid input" },
      },
      { status: 400 },
    );
  }

  if (err instanceof AppError) {
    logger.warn({ err, code: err.code }, err.message);
    return NextResponse.json(
      { ok: false, error: { code: err.code, message: err.message } },
      { status: err.status },
    );
  }

  logger.error({ err }, "Unhandled error");
  return NextResponse.json(
    {
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
    },
    { status: 500 },
  );
}
