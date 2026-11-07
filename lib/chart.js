// Duration chart math: bucket finished runs, p50 per bucket.
// Pure and tested; the chart component only draws what this returns.
import { percentile } from "./state.js";

const WINDOWS = {
  "24h": { hours: 24, bucketMs: 3600000, label: (d) => `${String(d.getUTCHours()).padStart(2, "0")}:00` },
  "7d": { hours: 24 * 7, bucketMs: 86400000, label: (d) => d.toISOString().slice(5, 10) },
  "30d": { hours: 24 * 30, bucketMs: 86400000, label: (d) => d.toISOString().slice(5, 10) },
};

export function chartWindows() {
  return Object.keys(WINDOWS);
}

// runs: { started_at, duration_ms, status } rows. Returns one bucket
// per window slice, oldest first, with p50 in ms or null when empty.
export function bucketP50(runs, windowKey, now = new Date()) {
  const win = WINDOWS[windowKey] ?? WINDOWS["7d"];
  const start = now.getTime() - win.hours * 3600000;
  const count = Math.ceil(win.hours * 3600000 / win.bucketMs);
  const buckets = [];
  for (let i = 0; i < count; i++) {
    const from = start + i * win.bucketMs;
    buckets.push({ from, label: win.label(new Date(from)), values: [] });
  }
  for (const r of runs) {
    if (r.duration_ms == null) continue;
    if (r.status !== "success" && r.status !== "failed") continue;
    const t = new Date(r.started_at).getTime();
    if (t < start || t > now.getTime()) continue;
    const idx = Math.min(count - 1, Math.floor((t - start) / win.bucketMs));
    buckets[idx].values.push(r.duration_ms);
  }
  return buckets.map((b) => ({ label: b.label, p50: percentile(b.values, 0.5) }));
}
