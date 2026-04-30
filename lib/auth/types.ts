import type { User } from "@/lib/db/schema/users";

export type UserRole = User["role"];

/**
 * Universal "actor" type used everywhere a mutation or audit row is written.
 * Agents and the system itself are first-class actors so audit attribution
 * is never lost.
 */
export type Actor =
  | { type: "USER"; id: string; role: UserRole; email: string }
  | { type: "AGENT"; id: string; agentName: string; agentRunId: string }
  | { type: "SYSTEM"; id: string };

export const SYSTEM_ACTOR: Actor = { type: "SYSTEM", id: "system" };
