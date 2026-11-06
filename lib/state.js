// Job status derivation (PLAN 0.1 state model, binding order):
// 1. open alert -> Down, or Timed-out for a timeout alert
// 2. a run in progress -> Up
// 3. past expected run: inside grace -> Late (never alerts),
//    grace expired -> Down (missed)
// 4. otherwise Up
// 5. New: no finished run yet, or no schedule configured.
export function deriveStatus(input, now = new Date()) {
  const { hasFinishedRun, hasSchedule, openAlertKind, hasRunningRun, lastExpected, graceSeconds } = input;
  if (openAlertKind) return openAlertKind === "timeout" ? "timed_out" : "down";
  if (hasRunningRun) return "up";
  if (!hasFinishedRun || !hasSchedule) return "new";
  if (!lastExpected) return "up";
  const graceMs = (graceSeconds ?? 300) * 1000;
  if (now.getTime() > lastExpected.getTime() + graceMs) return "down";
  if (now.getTime() > lastExpected.getTime()) return "late";
  return "up";
}

// Consecutive failed runs, newest first. A missed run counts as a
// failure for this number: the dashboard shows how long the job has
// been failing, not just how many finish pings failed.
export function consecutiveFailures(runsNewestFirst) {
  let n = 0;
  for (const r of runsNewestFirst) {
    if (r.status === "failed" || r.status === "timed_out" || r.synthetic === "missed") n++;
    else break;
  }
  return n;
}

// p95 (or any percentile) of a list of numbers. Null when empty.
export function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
}

// Merge synthetic missed rows (built from missed alerts) into a run
// list, newest first. Missed runs have no log and are never editable.
export function withSyntheticMissed(runs, missedAlerts) {
  const synthetic = missedAlerts.map((a) => ({
    id: `missed-${a.id}`,
    synthetic: "missed",
    status: "missed",
    started_at: a.created_at,
    finished_at: null,
    duration_ms: null,
    exit_error: null,
    log_excerpt: null,
  }));
  return [...runs, ...synthetic].sort(
    (a, b) => new Date(b.started_at) - new Date(a.started_at)
  );
}

// 30-day tick strip: one tick per day, colored by the worst status
// that day, hollow for no runs. Any failed, timed-out, or missed run
// makes the day down; a day of only successes is up.
export function tickStrip(runs, missedAlerts, days = 30, now = new Date()) {
  const bad = new Set(["failed", "timed_out"]);
  const byDay = new Map(); // date -> "up" | "down"
  for (const r of runs) {
    const day = new Date(r.started_at).toISOString().slice(0, 10);
    if (bad.has(r.status)) byDay.set(day, "down");
    else if (!byDay.has(day)) byDay.set(day, "up");
  }
  for (const a of missedAlerts) {
    byDay.set(new Date(a.created_at).toISOString().slice(0, 10), "down");
  }
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
    out.push({ date: d, status: byDay.get(d) ?? "none" });
  }
  return out;
}
