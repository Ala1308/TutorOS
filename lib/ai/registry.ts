import type { AgentDefinition } from "./types";

/**
 * Central registry of every agent. `runAgent` looks up by name here.
 *
 * To add an agent:
 *   1. Create lib/ai/agents/<name>.ts that calls `defineAgent(...)`
 *   2. Import it once in lib/ai/registry.bootstrap.ts
 *   3. Done — runAgent("<name>", ...) just works
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- registry is heterogeneous by design
const agents = new Map<string, AgentDefinition<any, any>>();

export function defineAgent<TInput, TOutput>(
  def: AgentDefinition<TInput, TOutput>,
): AgentDefinition<TInput, TOutput> {
  if (agents.has(def.name)) {
    throw new Error(`Agent "${def.name}" already registered`);
  }
  agents.set(def.name, def);
  return def;
}

export function getAgent(name: string): AgentDefinition<unknown, unknown> {
  const def = agents.get(name);
  if (!def) throw new Error(`Unknown agent: ${name}`);
  return def as AgentDefinition<unknown, unknown>;
}

export function listAgents(): AgentDefinition<unknown, unknown>[] {
  return Array.from(agents.values()) as AgentDefinition<unknown, unknown>[];
}
