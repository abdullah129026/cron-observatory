// Auth callback: exchange the magic-link code for a session, then
// go to the dashboard (which redirects to /onboarding when the
// account has no project yet).
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createStore } from "@/lib/store.js";
import { isConfigured } from "@/lib/db.js";
import { event } from "@/lib/log.js";

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";
  const origin = url.origin;
  if (!code) return NextResponse.redirect(`${origin}/login`);
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options));
          } catch { /* ignore */ }
        },
      },
    }
  );
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/login?error=link`);
  // First completed sign-in: the account has no projects yet.
  // Analytics only; a failure here must never break the sign-in.
  try {
    const { data } = await supabase.auth.getUser();
    if (data?.user && isConfigured()) {
      const store = createStore();
      const projects = await store.listProjectsByOwner(data.user.id);
      if (projects.length === 0) event("signup_completed", { user_id: data.user.id });
    }
  } catch { /* ignore */ }
  return NextResponse.redirect(`${origin}${next}`);
}
