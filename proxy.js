// Session refresh for dashboard routes. Ingest (/v1/*), health, and
// the cron check endpoint skip this: they use API keys and bearer
// secrets, and refreshing a session per ping burned the Hobby CPU
// quota in an earlier project (PLAN 0.0).
//
// Signed-out requests to app pages redirect to /login here, before
// any byte renders: the pages stream a loading shell first, so a
// page-level redirect alone arrives as a 200 with a meta refresh
// and a flash of app chrome (docs 9). Cookie presence is only the
// fast gate; the pages still verify the session themselves, so an
// expired cookie falls back to their own redirect.
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

const PROTECTED = [/^\/dashboard/, /^\/settings/, /^\/onboarding/, /^\/jobs\//];

export async function proxy(request) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return response;
  if (PROTECTED.some((re) => re.test(request.nextUrl.pathname))) {
    const ref = new URL(url).hostname.split(".")[0];
    if (!request.cookies.has(`sb-${ref}-auth-token`)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!v1|api/health|api/cron|_next/static|_next/image|favicon.ico).*)"],
};
