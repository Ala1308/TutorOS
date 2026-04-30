import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs on every request:
 *   1. Refreshes the Supabase session if the access token is expired (rewrites
 *      cookies on the response so the browser keeps it).
 *   2. Sets `x-pathname` so server layouts can know the active route without
 *      pulling in next/navigation.
 *   3. Redirects unauthenticated users away from /(app) routes.
 *
 * If Supabase env is missing the middleware silently no-ops — the rest of the
 * app still runs in dev (per CONTRIBUTING.md §4: optional integrations
 * degrade gracefully).
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  response.headers.set("x-pathname", request.nextUrl.pathname);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return response;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options: CookieOptions;
        }>,
      ) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set({ name, value, ...options });
        });
      },
    },
  });

  // Refresh session if needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Gate (app) routes behind auth. (auth) and api routes pass through.
  const path = request.nextUrl.pathname;
  const isProtected =
    path === "/" ||
    path.startsWith("/leads") ||
    path.startsWith("/parents") ||
    path.startsWith("/students") ||
    path.startsWith("/tutors") ||
    path.startsWith("/sessions") ||
    path.startsWith("/approvals") ||
    path.startsWith("/agent-runs") ||
    path.startsWith("/audit-log") ||
    path.startsWith("/automation-settings");

  if (isProtected && !user) {
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = "/login";
    signInUrl.searchParams.set("next", path);
    return NextResponse.redirect(signInUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match every path except:
     *   - _next/static, _next/image (built assets)
     *   - favicon.ico, robots.txt
     *   - api/inngest, api/voice, api/public/* (webhooks; have their own auth)
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|api/inngest|api/voice|api/public).*)",
  ],
};
