import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { agentSettings, type AgentSettings } from "@/lib/db/schema";

import type { Actor } from "@/lib/auth/types";
import type { AutomationLevel, LLMProvider, RiskLevel } from "@/lib/ai/types";

import { auditService } from "./auditService";

const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const AUTOMATION_LEVELS = [
  "MANUAL",
  "DRAFT_ONLY",
  "AUTO_AFTER_APPROVAL",
  "FULL_AUTO",
] as const;
const PROVIDERS: readonly LLMProvider[] = [
  "anthropic",
  "openai",
  "google",
] as const;

export const agentSettingsUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  systemPromptOverride: z.string().max(40_000).nullable().optional(),
  modelProvider: z
    .enum(PROVIDERS as readonly [string, ...string[]])
    .nullable()
    .optional(),
  modelName: z.string().min(1).max(120).nullable().optional(),
  /** Hundredths (e.g. 70 = 0.7). Range 0..200. */
  temperatureBp: z.number().int().min(0).max(200).nullable().optional(),
  /** Hundredths (e.g. 75 = 0.75). Range 0..100. */
  confidenceThresholdBp: z.number().int().min(0).max(100).nullable().optional(),
  maxRiskLevel: z.enum(RISK_LEVELS).nullable().optional(),
  defaultAutomationLevel: z.enum(AUTOMATION_LEVELS).nullable().optional(),
  costCapCents: z.number().int().min(0).max(1_000_000).nullable().optional(),
  timeoutMs: z.number().int().min(1_000).max(600_000).nullable().optional(),
});
export type AgentSettingsUpdateInput = z.infer<
  typeof agentSettingsUpdateSchema
>;

/** Fields that, when changed, bump `promptVersion`. */
const VERSION_BUMP_FIELDS = [
  "systemPromptOverride",
  "modelProvider",
  "modelName",
  "temperatureBp",
] as const satisfies readonly (keyof AgentSettingsUpdateInput)[];

export const agentSettingsService = {
  async get(agentName: string): Promise<AgentSettings | null> {
    const [row] = await db
      .select()
      .from(agentSettings)
      .where(eq(agentSettings.agentName, agentName))
      .limit(1);
    return row ?? null;
  },

  async listAll(): Promise<AgentSettings[]> {
    return db.select().from(agentSettings);
  },

  /**
   * Upsert by agent name. Bumps `promptVersion` whenever a prompt-/model-affecting
   * field changes.
   */
  async upsert(
    agentName: string,
    input: AgentSettingsUpdateInput,
    opts: { actor: Actor },
  ): Promise<AgentSettings> {
    const validated = agentSettingsUpdateSchema.parse(input);

    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(agentSettings)
        .where(eq(agentSettings.agentName, agentName))
        .limit(1);

      const bump = VERSION_BUMP_FIELDS.some((f) => {
        if (validated[f] === undefined) return false;
        if (!existing) return validated[f] !== null;
        return validated[f] !== (existing as Record<string, unknown>)[f];
      });

      let row: AgentSettings;
      if (existing) {
        // Strip `undefined` so we don't overwrite untouched columns.
        const updates: Record<string, unknown> = { updatedAt: new Date() };
        for (const [k, v] of Object.entries(validated)) {
          if (v !== undefined) updates[k] = v;
        }
        updates.promptVersion = bump
          ? existing.promptVersion + 1
          : existing.promptVersion;

        const [updated] = await tx
          .update(agentSettings)
          .set(updates)
          .where(eq(agentSettings.agentName, agentName))
          .returning();
        if (!updated) throw new Error("Failed to update agent_settings");
        row = updated;
      } else {
        const [inserted] = await tx
          .insert(agentSettings)
          .values({
            agentName,
            enabled: validated.enabled ?? true,
            systemPromptOverride: validated.systemPromptOverride ?? null,
            modelProvider: validated.modelProvider ?? null,
            modelName: validated.modelName ?? null,
            temperatureBp: validated.temperatureBp ?? null,
            confidenceThresholdBp: validated.confidenceThresholdBp ?? null,
            maxRiskLevel: validated.maxRiskLevel ?? null,
            defaultAutomationLevel: validated.defaultAutomationLevel ?? null,
            costCapCents: validated.costCapCents ?? null,
            timeoutMs: validated.timeoutMs ?? null,
            promptVersion: 1,
          })
          .returning();
        if (!inserted) throw new Error("Failed to insert agent_settings");
        row = inserted;
      }

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "agent.settings.updated",
          entityType: "AgentSettings",
          entityId: agentName,
          metadata: { promptVersion: row.promptVersion, bumped: bump },
        },
        tx,
      );

      return row;
    });
  },

  /** Convenience: convert a row's overrides into typed runtime fields. */
  toOverrides(row: AgentSettings | null): {
    enabled: boolean;
    systemPromptOverride: string | null;
    modelProvider: LLMProvider | null;
    modelName: string | null;
    temperature: number | null;
    confidenceThreshold: number | null;
    maxRiskLevel: RiskLevel | null;
    defaultAutomationLevel: AutomationLevel | null;
    costCapCents: number | null;
    timeoutMs: number | null;
    promptVersion: number;
  } {
    if (!row) {
      return {
        enabled: true,
        systemPromptOverride: null,
        modelProvider: null,
        modelName: null,
        temperature: null,
        confidenceThreshold: null,
        maxRiskLevel: null,
        defaultAutomationLevel: null,
        costCapCents: null,
        timeoutMs: null,
        promptVersion: 1,
      };
    }
    return {
      enabled: row.enabled,
      systemPromptOverride: row.systemPromptOverride ?? null,
      modelProvider: (row.modelProvider as LLMProvider | null) ?? null,
      modelName: row.modelName ?? null,
      temperature:
        row.temperatureBp !== null && row.temperatureBp !== undefined
          ? row.temperatureBp / 100
          : null,
      confidenceThreshold:
        row.confidenceThresholdBp !== null &&
        row.confidenceThresholdBp !== undefined
          ? row.confidenceThresholdBp / 100
          : null,
      maxRiskLevel: (row.maxRiskLevel as RiskLevel | null) ?? null,
      defaultAutomationLevel:
        (row.defaultAutomationLevel as AutomationLevel | null) ?? null,
      costCapCents: row.costCapCents ?? null,
      timeoutMs: row.timeoutMs ?? null,
      promptVersion: row.promptVersion,
    };
  },
};
