import { pgEnum } from "drizzle-orm/pg-core";

/**
 * All enums live here so they can be referenced from any schema file
 * without circular imports.
 */

export const userRoleEnum = pgEnum("user_role", [
  "OWNER",
  "ADMIN",
  "ACADEMIC_MANAGER",
  "TUTOR",
  "PARENT",
  "STUDENT",
  "AI_AGENT",
]);

export const riskLevelEnum = pgEnum("risk_level", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

export const automationModeEnum = pgEnum("automation_mode", [
  "MANUAL",
  "DRAFT_ONLY",
  "AUTO_AFTER_APPROVAL",
  "FULL_AUTO",
]);

export const agentRunStatusEnum = pgEnum("agent_run_status", [
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "TIMEOUT",
  "AWAITING_APPROVAL",
  "REJECTED",
]);

export const approvalStatusEnum = pgEnum("approval_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CHANGES_REQUESTED",
  "EXPIRED",
]);

export const actorTypeEnum = pgEnum("actor_type", ["USER", "AGENT", "SYSTEM"]);

export const consentTypeEnum = pgEnum("consent_type", [
  "DATA_PROCESSING",
  "EMAIL_COMMUNICATION",
  "SESSION_RECORDING",
  "SESSION_TRANSCRIPTION",
  "MARKETING_COMMUNICATION",
]);

export const leadStatusEnum = pgEnum("lead_status", [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "DISQUALIFIED",
  "CONVERTED",
  "ARCHIVED",
]);

export const leadSourceEnum = pgEnum("lead_source", [
  "WEBSITE",
  "REFERRAL",
  "SOCIAL",
  "PARTNER",
  "ADS",
  "OTHER",
]);

export const sessionStatusEnum = pgEnum("session_status", [
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELED",
  "NO_SHOW",
]);

export const tutorStatusEnum = pgEnum("tutor_status", [
  "APPLIED",
  "SCREENING",
  "TEST_SENT",
  "INTERVIEW",
  "ACTIVE",
  "INACTIVE",
  "REJECTED",
]);

export const assessmentTypeEnum = pgEnum("assessment_type", [
  "DIAGNOSTIC",
  "PROGRESS",
  "FINAL",
  "OTHER",
]);

export const homeworkStatusEnum = pgEnum("homework_status", [
  "ASSIGNED",
  "SUBMITTED",
  "REVIEWED",
  "COMPLETED",
  "MISSED",
]);

export const learningPlanStatusEnum = pgEnum("learning_plan_status", [
  "DRAFT",
  "ACTIVE",
  "COMPLETED",
  "ARCHIVED",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "DRAFT",
  "SENT",
  "PAID",
  "OVERDUE",
  "VOID",
]);

export const commDirectionEnum = pgEnum("comm_direction", [
  "INBOUND",
  "OUTBOUND",
]);

export const callOutcomeEnum = pgEnum("call_outcome", [
  "ANSWERED",
  "VOICEMAIL",
  "NO_ANSWER",
  "BUSY",
  "FAILED",
]);
