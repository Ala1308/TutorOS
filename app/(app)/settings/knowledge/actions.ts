"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { logger } from "@/lib/logger";
import {
  knowledgeDocumentSchema,
  knowledgeService,
} from "@/lib/services/knowledgeService";
import { AppError } from "@/lib/utils/errors";

const idSchema = z.string().uuid();

export type KnowledgeMutationResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

/** Splits a comma-separated input into trimmed, non-empty strings. */
function splitList(s: unknown): string[] {
  if (typeof s !== "string") return [];
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

const formSchema = z.object({
  title: z.string(),
  content: z.string(),
  tags: z.string().optional(),
  agentScopes: z.string().optional(),
  enabled: z.union([z.literal("on"), z.literal("off")]).optional(),
});

function parseForm(input: unknown) {
  const raw = formSchema.parse(input);
  return knowledgeDocumentSchema.parse({
    title: raw.title,
    content: raw.content,
    tags: splitList(raw.tags),
    agentScopes: (() => {
      const list = splitList(raw.agentScopes);
      return list.length === 0 ? ["*"] : list;
    })(),
    enabled: raw.enabled !== "off",
  });
}

export async function createKnowledgeAction(
  input: unknown,
): Promise<KnowledgeMutationResult> {
  const actor = await requireAuth(["OWNER", "ADMIN", "ACADEMIC_MANAGER"]);
  ensure(actor, "knowledge.write");

  try {
    const data = parseForm(input);
    const row = await knowledgeService.create(data, { actor });
    revalidatePath("/settings/knowledge");
    revalidatePath("/audit-log");
    return { ok: true, id: row.id };
  } catch (err) {
    logger.warn({ err }, "createKnowledgeAction failed");
    if (err instanceof AppError) return { ok: false, error: err.message };
    if (err instanceof z.ZodError) {
      return { ok: false, error: "Invalid input" };
    }
    return { ok: false, error: "Could not create document. Check logs." };
  }
}

export async function updateKnowledgeAction(
  id: unknown,
  input: unknown,
): Promise<KnowledgeMutationResult> {
  const actor = await requireAuth(["OWNER", "ADMIN", "ACADEMIC_MANAGER"]);
  ensure(actor, "knowledge.write");

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Invalid id" };

  try {
    const data = parseForm(input);
    await knowledgeService.update(parsedId.data, data, { actor });
    revalidatePath("/settings/knowledge");
    revalidatePath("/audit-log");
    return { ok: true };
  } catch (err) {
    logger.warn({ err, id: parsedId.data }, "updateKnowledgeAction failed");
    if (err instanceof AppError) return { ok: false, error: err.message };
    if (err instanceof z.ZodError) return { ok: false, error: "Invalid input" };
    return { ok: false, error: "Could not update document. Check logs." };
  }
}

export async function deleteKnowledgeAction(
  id: unknown,
): Promise<KnowledgeMutationResult> {
  const actor = await requireAuth(["OWNER", "ADMIN", "ACADEMIC_MANAGER"]);
  ensure(actor, "knowledge.write");

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Invalid id" };

  try {
    await knowledgeService.delete(parsedId.data, { actor });
    revalidatePath("/settings/knowledge");
    revalidatePath("/audit-log");
    return { ok: true };
  } catch (err) {
    logger.warn({ err, id: parsedId.data }, "deleteKnowledgeAction failed");
    if (err instanceof AppError) return { ok: false, error: err.message };
    return { ok: false, error: "Could not delete document. Check logs." };
  }
}
