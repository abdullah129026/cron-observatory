// Per-key rate limit: 60 pings/min (PLAN 0.1). In-memory sliding
// window per isolate.
// ponytail: per-isolate counting, not global. A fleet of isolates
// lets a runaway key through at N x the limit. Move the counter to
// the DB (one row per key per minute) if ingest ever runs hot.
const windows = new Map(); // keyHash -> { count, resetAt }
const LIMIT = 60;
const WINDOW_MS = 60000;

export function checkRateLimit(keyHash, now = Date.now()) {
  const w = windows.get(keyHash);
  if (!w || now >= w.resetAt) {
    windows.set(keyHash, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: LIMIT - 1 };
  }
  if (w.count >= LIMIT) return { allowed: false, remaining: 0 };
  w.count += 1;
  return { allowed: true, remaining: LIMIT - w.count };
}

export function resetRateLimits() {
  windows.clear();
}
