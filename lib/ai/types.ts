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
  handler: (input: TInput, ctx: ToolContext) => Promise<TOutput>;
}
