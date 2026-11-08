// Supabase clients. service_role stays server-side only; the key
// must never reach the browser, not even via RSC props (PLAN ADR 5).
// Both clients are null-safe: without env vars the app renders
// degraded states instead of 500ing (same pattern as projects 2/3).
import { createClient } from "@supabase/supabase-js";

// The Supabase client ships no request timeout, so a hung database
// hangs every page that awaits it. Cap every query at 10s; callers
// that need to stay fast (the public landing page) race tighter.
function timedFetch(input, init) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  return fetch(input, { ...init, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

export function serviceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: timedFetch },
  });
}

export function dbFromEnv() {
  return serviceClient();
}

export function isConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
