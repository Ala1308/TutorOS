import { NextResponse } from "next/server";

import { integrations } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "tutoros",
    integrations: {
      llm: integrations.hasAnyLLM(),
      supabase: integrations.hasSupabase(),
      langfuse: integrations.hasLangfuse(),
      inngest: integrations.hasInngest(),
      google: integrations.hasGoogleOAuth(),
      voice: integrations.voiceProvider(),
    },
  });
}
