import { logger } from "@/lib/logger";
import { ForbiddenError, ValidationError } from "@/lib/utils/errors";

import type {
  ToolApprovalRequired,
  ToolContext,
  ToolDefinition,
} from "./types";

/**
 * Central registry of every tool. Agents may invoke only tools listed in
 * their `allowedTools`. Use `runTool` to execute — it validates input,
 * enforces permissions, gates medium/high tools through automation +
 * approvals, and writes the audit row.
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
 * `runTool` returns either the validated tool output or an
 * `ToolApprovalRequired` envelope when the call was deferred to a human.
 * Agents must check `__status === "approval_required"` before treating the
 * value as the tool's normal output.
 */
export type RunToolResult<TOutput> = TOutput | ToolApprovalRequired;

export function isApprovalRequired(v: unknown): v is ToolApprovalRequired {
  return (
    typeof v === "object" &&
    v !== null &&
    (v as { __status?: unknown }).__status === "approval_required"
  );
}

/**
 * Single execution path for tools.
 *
 * Order of checks (per CONTRIBUTING §13 "Tool Execution Flow"):
 *   1. Validate input.
 *   2. Check actor permissions.
 *   3. Check automation mode for medium/high tools.
 *   4. Create approval if needed.
 *   5. Execute handler if allowed.
 *   6. Audit the action.
 *   7. Return structured result.
 *
 * Read-only / low-risk tools skip the automation + approval steps. Human
 * users (`actor.type === "USER"`) also bypass the gate — operators acting
 * directly through the UI are the approval, not the proposer.
 */
export async function runTool<TInput, TOutput>(
  name: string,
  input: TInput,
  ctx: ToolContext,
): Promise<RunToolResult<TOutput>> {
  const tool = getTool(name) as ToolDefinition<TInput, TOutput>;

  const parseResult = tool.inputSchema.safeParse(input);
  if (!parseResult.success) {
    throw new ValidationError(
      `Tool ${name} input invalid`,
      parseResult.error.flatten(),
    );
  }
  const validated = parseResult.data;

  const allowed =
    ctx.actor.type === "SYSTEM" ||
    (ctx.actor.type === "AGENT" && tool.requiredRole.includes("AI_AGENT")) ||
    (ctx.actor.type === "USER" && tool.requiredRole.includes(ctx.actor.role));

  if (!allowed) {
    throw new ForbiddenError(`Actor cannot run tool ${name}`);
  }

  const needsGate =
    (tool.category === "medium" || tool.category === "high") &&
    ctx.actor.type === "AGENT";

  if (needsGate) {
    const gateResult = await applyAutomationGate(tool, validated, ctx);
    if (gateResult) return gateResult as RunToolResult<TOutput>;
  }

  const start = Date.now();
  try {
    const result = await tool.handler(validated, ctx);
    const out = tool.outputSchema.parse(result);

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

    return out;
  } catch (err) {
    logger.error({ err, tool: name }, "Tool execution failed");
    throw err;
  }
}

/**
 * Reads the operator's automation preference for the tool's workflow step
 * and either:
 *   - allows immediate execution (FULL_AUTO),
 *   - creates a PENDING approval and returns a deferred result, or
 *   - throws when the operator has set MANUAL.
 *
 * `DRAFT_ONLY` is treated as approval-required for tool calls because the
 * tool surface is the action surface — the "draft" lives in the approval
 * payload until the human resolves it.
 */
async function applyAutomationGate<TInput>(
  tool: ToolDefinition<TInput, unknown>,
  validated: TInput,
  ctx: ToolContext,
): Promise<ToolApprovalRequired | null> {
  if (!tool.workflowStep) {
    return null;
  }

  const operatorUserId = ctx.googleOAuthUserId;
  if (!operatorUserId) {
    throw new ForbiddenError(
      `Tool ${tool.name} requires an operator user id (ctx.googleOAuthUserId) to consult automation preferences.`,
    );
  }

  const { automationService } =
    await import("@/lib/services/automationService");
  const mode = await automationService.getMode(
    operatorUserId,
    tool.workflowStep,
  );

  if (mode === "FULL_AUTO") {
    if (tool.category === "high") {
      throw new ForbiddenError(
        `Tool ${tool.name} is category=high and cannot run as FULL_AUTO.`,
      );
    }
    return null;
  }

  if (mode === "MANUAL") {
    throw new ForbiddenError(
      `Tool ${tool.name} is set to MANUAL for ${tool.workflowStep}. Operator must take this action directly.`,
    );
  }

  const card = tool.buildApprovalDescription
    ? tool.buildApprovalDescription(validated)
    : {
        title: `Approve ${tool.name}`,
        description: `Agent proposed running ${tool.name}.`,
        entityType: "Tool",
        entityId: tool.name,
      };

  const { approvalService } = await import("@/lib/services/approvalService");
  const approval = await approvalService.create(
    {
      ...(ctx.agentRunId ? { agentRunId: ctx.agentRunId } : {}),
      title: card.title,
      description: card.description,
      entityType: card.entityType,
      entityId: card.entityId,
      proposedAction: tool.name,
      proposedPayload: validated as unknown,
      riskLevel: tool.riskLevel,
    },
    { actor: ctx.actor },
  );

  return {
    __status: "approval_required",
    approvalId: approval.id,
    workflowStep: tool.workflowStep,
    riskLevel: tool.riskLevel,
  };
}
