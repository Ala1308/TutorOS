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
  | "student.read"
  | "tutor.read"
  | "tutor.hire"
  | "session.read"
  | "session.create"
  | "session.update"
  | "approval.read"
  | "approval.resolve"
  | "agent.run"
  | "agent.runs.read"
  | "audit.read"
  | "automation.read"
  | "automation.update";

const matrix: Record<PermissionAction, UserRole[]> = {
  "lead.read": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "lead.create": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "lead.update": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "lead.score": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "lead.convert": ["OWNER", "ADMIN"],
  "lead.delete": ["OWNER", "ADMIN"],

  "parent.read": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "student.read": ["OWNER", "ADMIN", "ACADEMIC_MANAGER", "TUTOR", "PARENT"],
  "tutor.read": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "tutor.hire": ["OWNER", "ADMIN"],

  "session.read": ["OWNER", "ADMIN", "ACADEMIC_MANAGER", "TUTOR", "PARENT"],
  "session.create": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "session.update": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],

  "approval.read": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "approval.resolve": ["OWNER", "ADMIN"],

  "agent.run": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "agent.runs.read": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],

  "audit.read": ["OWNER", "ADMIN"],

  "automation.read": ["OWNER", "ADMIN", "ACADEMIC_MANAGER"],
  "automation.update": ["OWNER", "ADMIN"],
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
    if (action === "lead.delete") return false;
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
