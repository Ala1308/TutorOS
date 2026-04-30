import { type NextRequest, NextResponse } from "next/server";

import { SYSTEM_ACTOR } from "@/lib/auth/types";
import { inngest } from "@/lib/inngest/client";
import { leadCreateSchema } from "@/lib/schemas/lead";
import { leadService } from "@/lib/services/leadService";
import { handleApiError } from "@/lib/utils/errors";

/**
 * Public lead intake endpoint. Wire your marketing site form to this URL.
 * Validates with Zod, creates the lead via the service (audited), then
 * fans out the workflow event so the leadScoring agent runs async.
 *
 * Add CAPTCHA / origin checks before opening this to the public internet.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = leadCreateSchema.parse(body);
    const lead = await leadService.create(validated, { actor: SYSTEM_ACTOR });

    await inngest.send({ name: "lead.created", data: { leadId: lead.id } });

    return NextResponse.json({ ok: true, id: lead.id }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
