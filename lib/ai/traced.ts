import { Langfuse } from "langfuse";

import { env, integrations } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Lightweight Langfuse wrapper. Every model call should be traced; if Langfuse
 * isn't configured we no-op so dev still works without the integration.
 */

let _langfuse: Langfuse | null = null;
function getLangfuse(): Langfuse | null {
  if (!integrations.hasLangfuse()) return null;
  if (!_langfuse) {
    _langfuse = new Langfuse({
      publicKey: env.LANGFUSE_PUBLIC_KEY!,
      secretKey: env.LANGFUSE_SECRET_KEY!,
      baseUrl: env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com",
    });
  }
  return _langfuse;
}

export interface TraceMeta {
  agentName: string;
  agentVersion: number;
  agentRunId: string;
  workflowStep: string;
  actorType: string;
  actorId: string;
  entityType?: string;
  entityId?: string;
}

export interface TracedRun<TOutput> {
  output: TOutput;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
  langfuseTraceId?: string;
}

export async function traced<TOutput>(
  meta: TraceMeta,
  inputForTrace: unknown,
  fn: () => Promise<{
    output: TOutput;
    usage?: { inputTokens?: number; outputTokens?: number };
    costCents?: number;
  }>,
): Promise<TracedRun<TOutput>> {
  const lf = getLangfuse();
  const trace = lf?.trace({
    id: meta.agentRunId,
    name: `${meta.agentName}@${meta.agentVersion}`,
    metadata: {
      workflowStep: meta.workflowStep,
      actorType: meta.actorType,
      actorId: meta.actorId,
      ...(meta.entityType && { entityType: meta.entityType }),
      ...(meta.entityId && { entityId: meta.entityId }),
    },
    input: inputForTrace,
  });

  const start = Date.now();
  try {
    const result = await fn();
    const inputTokens = result.usage?.inputTokens ?? 0;
    const outputTokens = result.usage?.outputTokens ?? 0;
    const costCents = result.costCents ?? 0;

    trace?.update({ output: result.output });
    await lf?.flushAsync();

    return {
      output: result.output,
      inputTokens,
      outputTokens,
      costCents,
      ...(trace ? { langfuseTraceId: trace.id } : {}),
    };
  } catch (err) {
    logger.error(
      { err, agent: meta.agentName, durationMs: Date.now() - start },
      "Traced run failed",
    );
    trace?.update({
      output: { error: err instanceof Error ? err.message : String(err) },
    });
    await lf?.flushAsync();
    throw err;
  }
}
