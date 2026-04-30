import { logger } from "@/lib/logger";
import { ForbiddenError, ValidationError } from "@/lib/utils/errors";

import type { ToolContext, ToolDefinition } from "./types";

/**
 * Central registry of every tool. Agents may invoke only tools listed in
 * their `allowedTools`. Use `runTool` to execute — it validates input,
 * enforces permissions, and writes the audit row.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tools = new Map<string, ToolDefinition<any, any>>();

export function defineTool<TInput, TOutput>(
  def: ToolDefinition<TInput, TOutput>,
): ToolDefinition<TInput, TOutput> {
  if (tools.has(def.name)) {
    throw new Error(`Tool "${def.name}" already registered`);
  }
  tools.set(def.name, def);
  return def;
}

export function getTool(name: string): ToolDefinition<unknown, unknown> {
  const def = tools.get(name);
  if (!def) throw new Error(`Unknown tool: ${name}`);
  return def as ToolDefinition<unknown, unknown>;
}

export function listTools(): ToolDefinition<unknown, unknown>[] {
  return Array.from(tools.values()) as ToolDefinition<unknown, unknown>[];
}

/**
 * Single execution path for tools. Validates input, checks roles and risk,
 * runs the handler, writes audit. Approval gating for `medium` / `high`
 * tools is delegated to the calling agent / workflow via the approvalService.
 */
export async function runTool<TInput, TOutput>(
  name: string,
  input: TInput,
  ctx: ToolContext,
): Promise<TOutput> {
  const tool = getTool(name) as ToolDefinition<TInput, TOutput>;

  const parseResult = tool.inputSchema.safeParse(input);
  if (!parseResult.success) {
    throw new ValidationError(
      `Tool ${name} input invalid`,
      parseResult.error.flatten(),
    );
  }

  const allowed =
    ctx.actor.type === "SYSTEM" ||
    (ctx.actor.type === "AGENT" && tool.requiredRole.includes("AI_AGENT")) ||
    (ctx.actor.type === "USER" && tool.requiredRole.includes(ctx.actor.role));

  if (!allowed) {
    throw new ForbiddenError(`Actor cannot run tool ${name}`);
  }

  const start = Date.now();
  try {
    const result = await tool.handler(parseResult.data, ctx);
    const validated = tool.outputSchema.parse(result);

    // Audit. Imported lazily because services depend on the auth/db chain that
    // might not be desired in pure-function imports of this registry.
    const { auditService } = await import("@/lib/services/auditService");
    await auditService.logAuditEvent({
      actorType: ctx.actor.type,
      actorId: ctx.actor.id,
      action: `tool.${name}`,
      entityType: "Tool",
      entityId: name,
      ...(ctx.agentRunId ? { agentRunId: ctx.agentRunId } : {}),
      metadata: {
        category: tool.category,
        riskLevel: tool.riskLevel,
        durationMs: Date.now() - start,
      },
    });

    return validated;
  } catch (err) {
    logger.error({ err, tool: name }, "Tool execution failed");
    throw err;
  }
}
