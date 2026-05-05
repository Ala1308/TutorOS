import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  agentKnowledgeDocuments,
  type AgentKnowledgeDocument,
} from "@/lib/db/schema";
import { NotFoundError } from "@/lib/utils/errors";

import type { Actor } from "@/lib/auth/types";

import { auditService } from "./auditService";

export const knowledgeDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(40_000),
  tags: z.array(z.string().min(1).max(60)).max(20).default([]),
  agentScopes: z.array(z.string().min(1).max(80)).min(1).max(20).default(["*"]),
  enabled: z.boolean().default(true),
});
export type KnowledgeDocumentInput = z.infer<typeof knowledgeDocumentSchema>;

export const knowledgeService = {
  async list(): Promise<AgentKnowledgeDocument[]> {
    return db
      .select()
      .from(agentKnowledgeDocuments)
      .where(isNull(agentKnowledgeDocuments.deletedAt))
      .orderBy(agentKnowledgeDocuments.title);
  },

  async get(id: string): Promise<AgentKnowledgeDocument | null> {
    const [row] = await db
      .select()
      .from(agentKnowledgeDocuments)
      .where(
        and(
          eq(agentKnowledgeDocuments.id, id),
          isNull(agentKnowledgeDocuments.deletedAt),
        ),
      )
      .limit(1);
    return row ?? null;
  },

  /**
   * Returns enabled, non-deleted docs visible to `agentName`. A doc is visible
   * when its `agentScopes` array contains either the agent name or `*`.
   */
  async listForAgent(agentName: string): Promise<AgentKnowledgeDocument[]> {
    return db
      .select()
      .from(agentKnowledgeDocuments)
      .where(
        and(
          eq(agentKnowledgeDocuments.enabled, true),
          isNull(agentKnowledgeDocuments.deletedAt),
          sql`${agentKnowledgeDocuments.agentScopes} && ARRAY[${agentName}, '*']::text[]`,
        ),
      )
      .orderBy(agentKnowledgeDocuments.title);
  },

  async create(
    input: KnowledgeDocumentInput,
    opts: { actor: Actor },
  ): Promise<AgentKnowledgeDocument> {
    const validated = knowledgeDocumentSchema.parse(input);

    return db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(agentKnowledgeDocuments)
        .values(validated)
        .returning();
      if (!inserted) throw new Error("Failed to insert knowledge document");

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "knowledge.created",
          entityType: "AgentKnowledgeDocument",
          entityId: inserted.id,
          metadata: { title: inserted.title, scopes: inserted.agentScopes },
        },
        tx,
      );

      return inserted;
    });
  },

  async update(
    id: string,
    input: KnowledgeDocumentInput,
    opts: { actor: Actor },
  ): Promise<AgentKnowledgeDocument> {
    const validated = knowledgeDocumentSchema.parse(input);

    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(agentKnowledgeDocuments)
        .where(
          and(
            eq(agentKnowledgeDocuments.id, id),
            isNull(agentKnowledgeDocuments.deletedAt),
          ),
        )
        .limit(1);
      if (!existing) throw new NotFoundError("Knowledge document not found");

      const [updated] = await tx
        .update(agentKnowledgeDocuments)
        .set({ ...validated, updatedAt: new Date() })
        .where(eq(agentKnowledgeDocuments.id, id))
        .returning();
      if (!updated) throw new Error("Failed to update knowledge document");

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "knowledge.updated",
          entityType: "AgentKnowledgeDocument",
          entityId: id,
          metadata: { title: updated.title, scopes: updated.agentScopes },
        },
        tx,
      );

      return updated;
    });
  },

  async delete(id: string, opts: { actor: Actor }): Promise<void> {
    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(agentKnowledgeDocuments)
        .where(
          and(
            eq(agentKnowledgeDocuments.id, id),
            isNull(agentKnowledgeDocuments.deletedAt),
          ),
        )
        .limit(1);
      if (!existing) throw new NotFoundError("Knowledge document not found");

      await tx
        .update(agentKnowledgeDocuments)
        .set({ deletedAt: new Date() })
        .where(eq(agentKnowledgeDocuments.id, id));

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "knowledge.deleted",
          entityType: "AgentKnowledgeDocument",
          entityId: id,
          metadata: { title: existing.title },
        },
        tx,
      );
    });
  },
};
