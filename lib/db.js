// Supabase clients. service_role stays server-side only; the key
// must never reach the browser, not even via RSC props (PLAN ADR 5).
// Both clients are null-safe: without env vars the app renders
// degraded states instead of 500ing (same pattern as projects 2/3).
import { createClient } from "@supabase/supabase-js";

export function serviceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function dbFromEnv() {
  return serviceClient();
}

export function isConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
