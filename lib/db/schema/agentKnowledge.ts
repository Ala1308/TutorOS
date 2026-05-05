import { boolean, index, pgTable, text } from "drizzle-orm/pg-core";

import { idCol, softDelete, timestamps } from "./_helpers";

/**
 * Operator-curated knowledge snippets injected into agent prompts.
 *
 * Retrieval (MVP) is deterministic: an agent gets every enabled doc whose
 * `agentScopes` contains its name OR contains `*`. Tag-based filtering is the
 * next iteration; embeddings/RAG comes later (call sites won't change).
 */
export const agentKnowledgeDocuments = pgTable(
  "agent_knowledge_documents",
  {
    id: idCol(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    /** Free-form tag strings; not yet used for retrieval. */
    tags: text("tags").array().notNull().default([]),
    /** Either ['*'] (visible to every agent) or a list of agent names. */
    agentScopes: text("agent_scopes").array().notNull().default(["*"]),
    enabled: boolean("enabled").notNull().default(true),
    ...timestamps(),
    ...softDelete(),
  },
  (t) => ({
    enabledIdx: index("agent_knowledge_enabled_idx").on(t.enabled),
  }),
);

export type AgentKnowledgeDocument =
  typeof agentKnowledgeDocuments.$inferSelect;
export type NewAgentKnowledgeDocument =
  typeof agentKnowledgeDocuments.$inferInsert;
