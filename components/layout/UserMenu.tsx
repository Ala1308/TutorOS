import { signOutAction } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/supabase";

/**
 * Server component that renders the current operator's email + role, and a
 * sign-out button. Hidden if no session (the middleware should have already
 * redirected, but we render nothing as a defensive default).
 */
export async function UserMenu() {
  const actor = await getCurrentUser();
  if (!actor || actor.type !== "USER") return null;

  return (
    <div className="border-t p-3">
      <div className="mb-2 text-xs">
        <div className="truncate font-medium" title={actor.email}>
          {actor.email}
        </div>
        <div className="text-muted-foreground">{actor.role}</div>
      </div>
      <form action={signOutAction}>
        <Button type="submit" variant="outline" size="sm" className="w-full">
          Sign out
        </Button>
      </form>
    </div>
  );
}
