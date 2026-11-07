// Browser-safe Supabase client (magic-link sign-in, sign-out).
// No next/headers here: client components import this. Server-only
// bits live in lib/auth.js and lib/db.js.
import { createBrowserClient } from "@supabase/ssr";

export function authConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function browserClient() {
  if (!authConfigured()) return null;
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
