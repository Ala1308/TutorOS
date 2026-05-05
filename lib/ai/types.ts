import type { z } from "zod";

import type { Actor } from "@/lib/auth/types";

export type LLMProvider = "anthropic" | "openai" | "google";

export type ModelChoice = {
  provider: LLMProvider;
  model: string;
};

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AutomationLevel =
  | "MANUAL"
  | "DRAFT_ONLY"
  | "AUTO_AFTER_APPROVAL"
  | "FULL_AUTO";

export type TriggerSource = "manual" | "workflow" | "schedule";

export interface AgentRunContext {
  actor: Actor;
  triggerSource: TriggerSource;
  parentRunId?: string;
  entityType?: string;
  entityId?: string;
}

export interface AgentDefinition<TInput, TOutput> {
  name: string;
  version: number;
  purpose: string;
  model: ModelChoice;
  systemPrompt: string;
  inputSchema: z.ZodSchema<TInput>;
  outputSchema: z.ZodSchema<TOutput>;
  allowedTools: string[];
  workflowStep: string;
  defaultAutomationLevel: AutomationLevel;
  confidenceThreshold: number;
  maxRiskLevel: RiskLevel;
  costCapCents: number;
  timeoutMs: number;
}

export interface AgentRunResult<TOutput = unknown> {
  agentRunId: string;
  status: "COMPLETED" | "FAILED" | "TIMEOUT" | "AWAITING_APPROVAL" | "REJECTED";
  output: TOutput | null;
  requiresApproval: boolean;
  approvalRequestId?: string;
  error?: string;
  costCents: number;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

export type ToolCategory = "read" | "low" | "medium" | "high" | "governance";

export interface ToolContext {
  actor: Actor;
  agentRunId?: string;
  /**
   * TutorOS user id whose linked Google account should be used for Drive /
   * Gmail API calls. Required when `actor.type` is `SYSTEM` or `AGENT`.
   * Ignored for `USER` actors (their own tokens are always used).
   */
  googleOAuthUserId?: string;
}

export interface ToolDefinition<TInput, TOutput> {
  name: string;
  description: string;
  category: ToolCategory;
  inputSchema: z.ZodSchema<TInput>;
  outputSchema: z.ZodSchema<TOutput>;
  requiredRole: Array<
    | "OWNER"
    | "ADMIN"
    | "ACADEMIC_MANAGER"
    | "TUTOR"
    | "PARENT"
    | "STUDENT"
    | "AI_AGENT"
  >;
  riskLevel: RiskLevel;
  /**
   * Workflow step key (`<domain>.<step>`) consulted by `runTool` to read the
   * operator's automation preference for `medium` / `high` tools. When set,
   * the tool is gated: agents either get an approval request, an immediate
   * execution (`FULL_AUTO`), or a forbidden error (`MANUAL` / `DRAFT_ONLY`).
   */
  workflowStep?: string;
  /**
   * Optional builder for the human-facing approval card. When omitted, a
   * default card is constructed from the tool name + input. Callers should
   * supply this when input alone isn't enough context for an operator.
   */
  buildApprovalDescription?: (input: TInput) => {
    title: string;
    description: string;
    entityType: string;
    entityId: string;
  };
  handler: (input: TInput, ctx: ToolContext) => Promise<TOutput>;
}

/**
 * Result returned by `runTool` when the call is gated by the approval
 * system. The agent sees this as data — not an error — so it can hand off
 * to the operator gracefully.
 */
export interface ToolApprovalRequired {
  __status: "approval_required";
  approvalId: string;
  workflowStep: string;
  riskLevel: RiskLevel;
}
