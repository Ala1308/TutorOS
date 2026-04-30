"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { inngest } from "@/lib/inngest/client";
import { leadCreateSchema } from "@/lib/schemas/lead";
import { leadService } from "@/lib/services/leadService";

export async function createLeadAction(input: unknown) {
  const actor = await requireAuth(["OWNER", "ADMIN", "ACADEMIC_MANAGER"]);
  ensure(actor, "lead.create");

  const validated = leadCreateSchema.parse(input);
  const lead = await leadService.create(validated, { actor });

  await inngest.send({
    name: "lead.created",
    data: { leadId: lead.id },
  });

  revalidatePath("/leads");
  return { ok: true, id: lead.id };
}

export async function updateLeadStatusAction(input: {
  leadId: string;
  status:
    | "NEW"
    | "CONTACTED"
    | "QUALIFIED"
    | "DISQUALIFIED"
    | "CONVERTED"
    | "ARCHIVED";
}) {
  const actor = await requireAuth(["OWNER", "ADMIN", "ACADEMIC_MANAGER"]);
  ensure(actor, "lead.update");

  const updated = await leadService.updateStatus(input, { actor });
  revalidatePath(`/leads/${updated.id}`);
  revalidatePath("/leads");
  return { ok: true };
}
