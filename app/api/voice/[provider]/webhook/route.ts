import { type NextRequest, NextResponse } from "next/server";

import { getVoiceProvider } from "@/lib/voice";
import { handleApiError } from "@/lib/utils/errors";

/**
 * Single webhook entry that dispatches to the active voice provider's adapter.
 * Adding a new provider only needs:
 *   1. lib/voice/<provider>.ts implementing VoiceProviderAdapter (with
 *      mandatory signature verification inside `handleWebhook`).
 *   2. Switch case in lib/voice/index.ts.
 *
 * Path param `[provider]` is matched against the configured VOICE_PROVIDER
 * to defend against misrouted webhooks.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ provider: string }> },
) {
  try {
    const { provider } = await ctx.params;
    const adapter = getVoiceProvider();
    if (provider !== adapter.name) {
      return NextResponse.json(
        { ok: false, error: { code: "WRONG_PROVIDER", message: provider } },
        { status: 404 },
      );
    }

    const signature = req.headers.get("x-signature") ?? "";
    const payload = await req.json();
    const result = await adapter.handleWebhook(payload, signature);

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return handleApiError(err);
  }
}
