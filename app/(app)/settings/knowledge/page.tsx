import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import "@/lib/ai/registry.bootstrap";
import { listAgents } from "@/lib/ai/registry";
import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { knowledgeService } from "@/lib/services/knowledgeService";

import { KnowledgeDocCard } from "./KnowledgeDocCard";
import { NewKnowledgeForm } from "./NewKnowledgeForm";

export const metadata: Metadata = { title: "Knowledge" };
export const dynamic = "force-dynamic";

export default async function KnowledgeSettingsPage() {
  const actor = await requireAuth(["OWNER", "ADMIN", "ACADEMIC_MANAGER"]);
  ensure(actor, "knowledge.read");

  const docs = await knowledgeService.list();
  const agentNames = listAgents()
    .map((a) => a.name)
    .sort();

  return (
    <>
      <PageHeader
        title="Knowledge"
        description="Curated context injected into agent prompts. Use ` * ` to share with every agent or list specific agent names."
      />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Add document</CardTitle>
          </CardHeader>
          <CardContent>
            <NewKnowledgeForm agentNames={agentNames} />
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {docs.length} document{docs.length === 1 ? "" : "s"}
          </h2>
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              None yet. Add your first document above.
            </p>
          ) : (
            docs.map((doc) => (
              <KnowledgeDocCard
                key={doc.id}
                id={doc.id}
                agentNames={agentNames}
                initial={{
                  title: doc.title,
                  content: doc.content,
                  tags: (doc.tags ?? []).join(", "),
                  agentScopes: (doc.agentScopes ?? ["*"]).join(", "),
                  enabled: doc.enabled,
                }}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
