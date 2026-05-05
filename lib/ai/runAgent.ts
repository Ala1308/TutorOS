import { generateObject } from "ai";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { agentRuns } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { agentSettingsService } from "@/lib/services/agentSettingsService";
import { knowledgeService } from "@/lib/services/knowledgeService";
import { orgProfileService } from "@/lib/services/orgProfileService";
import { AgentExecutionError, ValidationError } from "@/lib/utils/errors";
import { newId } from "@/lib/utils/ids";

import { checkBudget } from "./budget";
import { resolveModel } from "./client";
import { composeSystemPrompt } from "./promptComposer";
import { getAgent } from "./registry";
import { baseAgentOutput } from "./schemas/_base";
import { traced } from "./traced";

import type {
  AgentRunContext,
  AgentRunResult,
  ModelChoice,
  RiskLevel,
} from "./types";

/**
 * Single entry point for any agent execution.
 *
 * The executor:
 *   1. Looks up the agent definition.
 *   2. Validates input.
 *   3. Checks rate limits and cost caps.
 *   4. Creates an `AgentRun` row (RUNNING).
 *   5. Builds the full prompt.
 *   6. Calls Vercel AI SDK with structured output.
 *   7. Wraps the call in Langfuse tracing.
 *   8. Validates output (extends baseAgentOutput).
 *   9. Decides outcome: confidence + risk + automation mode.
 *  10. Lets the caller (workflow / service) apply mutations or create approvals.
 *  11. Updates `AgentRun`.
 *  12. Writes audit log.
 *  13. Fires `agent.run.completed` (caller-side; runAgent stays I/O-light).
 *  14. Returns the result.
 */
export async function runAgent<TInput, TOutput>(args: {
  agentName: string;
  input: TInput;
  context: AgentRunContext;
}): Promise<AgentRunResult<TOutput>> {
  const start = Date.now();
  const def = getAgent(args.agentName);
  const agentRunId = newId();

  // 1+2. Validate input
  const inputResult = def.inputSchema.safeParse(args.input);
  if (!inputResult.success) {
    throw new ValidationError(
      `Invalid input for agent ${def.name}`,
      inputResult.error.flatten(),
    );
  }

  // Per-agent overrides from agent_settings + org profile + knowledge docs.
  // Failures here are non-fatal — log and fall back to in-code defaults.
  const overrides = await loadOverrides(def.name);
  if (!overrides.enabled) {
    throw new AgentExecutionError(
      def.name,
      "Agent is disabled in settings (Settings → Agents).",
    );
  }

  // 3. Cost cap
  const budgetCheck = await checkBudget(def.name);
  if (!budgetCheck.allowed) {
    throw new AgentExecutionError(
      def.name,
      `Budget check failed: ${budgetCheck.reason ?? "unknown"}`,
    );
  }

  const modelChoice: ModelChoice = {
    provider: overrides.modelProvider ?? def.model.provider,
    model: overrides.modelName ?? def.model.model,
  };
  const effectiveTimeoutMs = overrides.timeoutMs ?? def.timeoutMs;
  const effectiveConfidenceThreshold =
    overrides.confidenceThreshold ?? def.confidenceThreshold;
  const effectiveMaxRiskLevel = overrides.maxRiskLevel ?? def.maxRiskLevel;
  const effectiveVersion = def.version + (overrides.promptVersion - 1);

  const systemPrompt = composeSystemPrompt({
    agentName: def.name,
    inCodeSystemPrompt: def.systemPrompt,
    override: overrides.systemPromptOverride,
    orgProfile: overrides.orgProfile,
    knowledge: overrides.knowledge,
  });

  // 4. Insert RUNNING row
  await db.insert(agentRuns).values({
    id: agentRunId,
    agentName: def.name,
    agentVersion: effectiveVersion,
    workflowStep: def.workflowStep,
    triggerSource: args.context.triggerSource,
    ...(args.context.parentRunId
      ? { parentRunId: args.context.parentRunId }
      : {}),
    actorType: args.context.actor.type,
    actorId: args.context.actor.id,
    ...(args.context.entityType ? { entityType: args.context.entityType } : {}),
    ...(args.context.entityId ? { entityId: args.context.entityId } : {}),
    status: "RUNNING",
    input: inputResult.data as unknown,
    modelProvider: modelChoice.provider,
    modelName: modelChoice.model,
  });

  try {
    // 5+6+7. Trace + structured generation
    const model = resolveModel(modelChoice);

    // The agent output schema must extend baseAgentOutput; we validate twice
    // (once for the universal contract, once for the agent-specific one).
    const tracedResult = await traced(
      {
        agentName: def.name,
        agentVersion: effectiveVersion,
        agentRunId,
        workflowStep: def.workflowStep,
        actorType: args.context.actor.type,
        actorId: args.context.actor.id,
        ...(args.context.entityType
          ? { entityType: args.context.entityType }
          : {}),
        ...(args.context.entityId ? { entityId: args.context.entityId } : {}),
      },
      inputResult.data,
      async () => {
        const { object, usage } = await generateObject({
          model,
          system: systemPrompt,
          prompt: JSON.stringify(inputResult.data),
          schema: def.outputSchema,
          ...(overrides.temperature !== null
            ? { temperature: overrides.temperature }
            : {}),
          maxRetries: 1,
          abortSignal: AbortSignal.timeout(effectiveTimeoutMs),
        });
        return {
          output: object as TOutput,
          usage: {
            inputTokens: usage?.promptTokens ?? 0,
            outputTokens: usage?.completionTokens ?? 0,
          },
          costCents: estimateCostCents(modelChoice, usage),
        };
      },
    );

    // 8. Validate against base contract too (defensive)
    const baseValidation = baseAgentOutput.safeParse(tracedResult.output);
    if (!baseValidation.success) {
      throw new AgentExecutionError(
        def.name,
        `Output missing base agent fields: ${baseValidation.error.message}`,
      );
    }
    const out = baseValidation.data;

    // 9. Decide whether human approval is required.
    const requiresApproval = decideRequiresApproval({
      agentSays: out.requiresHumanApproval,
      confidence: out.confidence,
      confidenceThreshold: effectiveConfidenceThreshold,
      riskLevel: out.riskLevel as RiskLevel,
      maxRiskLevel: effectiveMaxRiskLevel,
    });

    // 11. Update AgentRun with results
    const status: AgentRunResult["status"] = requiresApproval
      ? "AWAITING_APPROVAL"
      : "COMPLETED";

    await db
      .update(agentRuns)
      .set({
        status,
        output: tracedResult.output as unknown,
        confidence: Math.round(out.confidence * 100),
        riskLevel: out.riskLevel as RiskLevel,
        riskFlags: out.riskFlags,
        requiresApproval: requiresApproval ? 1 : 0,
        inputTokens: tracedResult.inputTokens,
        outputTokens: tracedResult.outputTokens,
        costCents: tracedResult.costCents,
        ...(tracedResult.langfuseTraceId
          ? { langfuseTraceId: tracedResult.langfuseTraceId }
          : {}),
        completedAt: new Date(),
      })
      .where(eq(agentRuns.id, agentRunId));

    // 12. Audit
    const { auditService } = await import("@/lib/services/auditService");
    await auditService.logAuditEvent({
      actorType: args.context.actor.type,
      actorId: args.context.actor.id,
      action: "agent.run.completed",
      entityType: "AgentRun",
      entityId: agentRunId,
      agentRunId,
      metadata: {
        agentName: def.name,
        agentVersion: effectiveVersion,
        confidence: out.confidence,
        riskLevel: out.riskLevel,
        requiresApproval,
        costCents: tracedResult.costCents,
      },
    });

    return {
      agentRunId,
      status,
      output: tracedResult.output,
      requiresApproval,
      costCents: tracedResult.costCents,
      inputTokens: tracedResult.inputTokens,
      outputTokens: tracedResult.outputTokens,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, agent: def.name, agentRunId }, "Agent run failed");

    await db
      .update(agentRuns)
      .set({
        status: "FAILED",
        error: message,
        completedAt: new Date(),
      })
      .where(eq(agentRuns.id, agentRunId));

    throw err instanceof AgentExecutionError
      ? err
      : new AgentExecutionError(def.name, message);
  }
}

function decideRequiresApproval(args: {
  agentSays: boolean;
  confidence: number;
  confidenceThreshold: number;
  riskLevel: RiskLevel;
  maxRiskLevel: RiskLevel;
}): boolean {
  if (args.agentSays) return true;
  if (args.confidence < args.confidenceThreshold) return true;
  const order: RiskLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  if (order.indexOf(args.riskLevel) > order.indexOf(args.maxRiskLevel))
    return true;
  if (args.riskLevel === "HIGH" || args.riskLevel === "CRITICAL") return true;
  return false;
}

/**
 * Loads operator overrides + knowledge for this agent. Each lookup is
 * non-fatal — if the personalization tables are missing or a query fails we
 * fall back to in-code defaults so a fresh DB never bricks agent runs.
 */
async function loadOverrides(agentName: string) {
  const fallback = agentSettingsService.toOverrides(null);
  let overrides = fallback;
  try {
    const row = await agentSettingsService.get(agentName);
    overrides = agentSettingsService.toOverrides(row);
  } catch (err) {
    logger.warn({ err, agentName }, "agent_settings lookup failed");
  }

  let orgProfile: Awaited<
    ReturnType<typeof orgProfileService.getOrCreate>
  > | null = null;
  try {
    orgProfile = await orgProfileService.getOrCreate();
  } catch (err) {
    logger.warn({ err, agentName }, "org_profile lookup failed");
  }

  let knowledge: Awaited<ReturnType<typeof knowledgeService.listForAgent>> = [];
  try {
    knowledge = await knowledgeService.listForAgent(agentName);
  } catch (err) {
    logger.warn({ err, agentName }, "knowledge lookup failed");
  }

  return { ...overrides, orgProfile, knowledge };
}

/** Rough cost estimate in cents. Real numbers vary by model; tighten later. */
function estimateCostCents(
  model: { provider: string; model: string },
  usage: { promptTokens?: number; completionTokens?: number } | undefined,
): number {
  if (!usage) return 0;
  const inT = usage.promptTokens ?? 0;
  const outT = usage.completionTokens ?? 0;
  // rough $/1M tokens
  const rates: Record<string, { in: number; out: number }> = {
    "claude-sonnet-4-latest": { in: 3, out: 15 },
    "claude-haiku-3-5": { in: 0.8, out: 4 },
    "gpt-4o": { in: 2.5, out: 10 },
    "gpt-4o-mini": { in: 0.15, out: 0.6 },
    "gemini-1.5-flash": { in: 0.075, out: 0.3 },
    "gemini-1.5-pro": { in: 1.25, out: 5 },
  };
  const r = rates[model.model];
  if (!r) return 0;
  const usd = (inT * r.in) / 1_000_000 + (outT * r.out) / 1_000_000;
  return Math.round(usd * 100);
}
