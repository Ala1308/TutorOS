import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { getCurrentUser } from "@/lib/auth/supabase";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defence-in-depth: middleware should already redirect, but enforce here
  // too in case middleware is bypassed (e.g. by a misconfigured matcher).
  const actor = await getCurrentUser();
  if (!actor) redirect("/login");

  const h = await headers();
  const pathname = h.get("x-pathname") ?? undefined;

  return (
    <AppShell {...(pathname ? { active: pathname } : {})}>{children}</AppShell>
  );
}
