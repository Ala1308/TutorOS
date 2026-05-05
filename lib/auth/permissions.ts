import { ForbiddenError } from "@/lib/utils/errors";

import type { Actor, UserRole } from "./types";

/**
 * App-level permission checks. RLS at the DB layer is the second line of
 * defense; this is the first. Both are required.
 *
 * Pattern: `<entity>.<verb>` — keep keys explicit, never wildcard.
 */
export type PermissionAction =
  | "lead.read"
  | "lead.create"
  | "lead.update"
  | "lead.score"
  | "lead.convert"
  | "lead.delete"
  | "parent.read"
  | "parent.create"
  | "parent.update"
  | "parent.delete"
  | "student.read"
  | "student.create"
  | "student.update"
  | "student.delete"
  | "tutor.read"
  | "tutor.create"
  | "tutor.update"
  | "tutor.delete"
  | "tutor.hire"
  | "tutor.status.update"
  | "session.read"
  | "session.create"
  | "session.update"
  | "session.cancel"
  | "session.delete"
  | "session.complete"
  | "approval.read"
  | "approval.resolve"
  | "agent.run"
  | "agent.runs.read"
  | "audit.read"
  | "automation.read"
  | "automation.update"
  | "integration.google.link"
  | "org.profile.read"
  | "org.profile.write"
  | "agent.settings.read"
  | "agent.settings.write"
  | "knowledge.read"
  | "knowledge.write"
  | "assessment.read"
  | "assessment.create"
  | "assessment.update"
  | "assessment.delete"
  | "homework.read"
  | "homework.create"
  | "homework.update"
  | "homework.status.update"
  | "homework.delete"
  | "learningPlan.read"
  | "learningPlan.create"
  | "learningPlan.update"
  | "learningPlan.delete"
  | "invoice.read"
  | "invoice.create"
  | "invoice.update"
  | "invoice.send"
  | "invoice.markPaid"
  | "invoice.void"
  | "invoice.delete"
  | "comm.read"
  | "comm.log";

const matrix: Record<PermissionAction, UserRole[]> = {
  "lead.read": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "lead.create": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "lead.update": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "lead.score": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "lead.convert": ["OWNER", "ADMIN"],
  "lead.delete": ["OWNER", "ADMIN"],

  "parent.read": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "parent.create": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "parent.update": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "parent.delete": ["OWNER", "ADMIN"],

  "student.read": ["OWNER", "ADMIN", "ACADEMIC_MANAGER", "TUTOR", "PARENT"],
  "student.create": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "student.update": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "student.delete": ["OWNER", "ADMIN"],

  "tutor.read": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "tutor.create": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "tutor.update": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "tutor.delete": ["OWNER", "ADMIN"],
  "tutor.hire": ["OWNER", "ADMIN"],
  "tutor.status.update": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],

  "session.read": ["OWNER", "ADMIN", "ACADEMIC_MANAGER", "TUTOR", "PARENT"],
  "session.create": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "session.update": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "session.cancel": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "session.delete": ["OWNER", "ADMIN"],
  "session.complete": ["OWNER", "ADMIN", "ACADEMIC_MANAGER", "TUTOR"],

  "approval.read": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "approval.resolve": ["OWNER", "ADMIN"],

  "agent.run": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "agent.runs.read": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],

  "audit.read": ["OWNER", "ADMIN"],

  "automation.read": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "automation.update": ["OWNER", "ADMIN"],

  "integration.google.link": ["OWNER", "ADMIN"],

  "org.profile.read": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "org.profile.write": ["OWNER", "ADMIN"],

  "agent.settings.read": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "agent.settings.write": ["OWNER", "ADMIN"],

  "knowledge.read": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "knowledge.write": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],

  "assessment.read": ["OWNER", "ADMIN", "ACADEMIC_MANAGER", "TUTOR", "PARENT"],
  "assessment.create": ["OWNER", "ADMIN", "ACADEMIC_MANAGER", "TUTOR"],
  "assessment.update": ["OWNER", "ADMIN", "ACADEMIC_MANAGER", "TUTOR"],
  "assessment.delete": ["OWNER", "ADMIN"],

  "homework.read": ["OWNER", "ADMIN", "ACADEMIC_MANAGER", "TUTOR", "PARENT"],
  "homework.create": ["OWNER", "ADMIN", "ACADEMIC_MANAGER", "TUTOR"],
  "homework.update": ["OWNER", "ADMIN", "ACADEMIC_MANAGER", "TUTOR"],
  "homework.status.update": [
    "OWNER",
    "ADMIN",
    "ACADEMIC_MANAGER",
    "TUTOR",
    "PARENT",
  ],
  "homework.delete": ["OWNER", "ADMIN"],

  "learningPlan.read": [
    "OWNER",
    "ADMIN",
    "ACADEMIC_MANAGER",
    "TUTOR",
    "PARENT",
  ],
  "learningPlan.create": ["OWNER", "ADMIN", "ACADEMIC_MANAGER", "TUTOR"],
  "learningPlan.update": ["OWNER", "ADMIN", "ACADEMIC_MANAGER", "TUTOR"],
  "learningPlan.delete": ["OWNER", "ADMIN"],

  "invoice.read": ["OWNER", "ADMIN", "ACADEMIC_MANAGER", "PARENT"],
  "invoice.create": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "invoice.update": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "invoice.send": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "invoice.markPaid": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "invoice.void": ["OWNER", "ADMIN"],
  "invoice.delete": ["OWNER", "ADMIN"],

  "comm.read": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "comm.log": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
};

export function can(
  actor: Actor,
  action: PermissionAction,
  _resource?: unknown,
): boolean {
  if (actor.type === "SYSTEM") return true;
  if (actor.type === "AGENT") {
    // Agents can never resolve approvals or grant themselves new permissions.
    if (action === "approval.resolve") return false;
    if (action === "automation.update") return false;
    if (action === "integration.google.link") return false;
    if (action === "lead.delete") return false;
    if (action === "org.profile.write") return false;
    if (action === "agent.settings.write") return false;
    if (action === "knowledge.write") return false;
    if (action === "parent.delete") return false;
    if (action === "student.delete") return false;
    if (action === "tutor.delete") return false;
    if (action === "session.delete") return false;
    if (action === "assessment.delete") return false;
    if (action === "homework.delete") return false;
    if (action === "learningPlan.delete") return false;
    if (action === "invoice.delete") return false;
    if (action === "invoice.void") return false;
    if (action === "invoice.markPaid") return false;
    return true;
  }
  return matrix[action].includes(actor.role);
}

/** Convenience: assert and throw on failure. */
export function ensure(
  actor: Actor,
  action: PermissionAction,
  resource?: unknown,
): void {
  if (!can(actor, action, resource)) {
    throw new ForbiddenError(`Cannot perform ${action}`);
  }
}
