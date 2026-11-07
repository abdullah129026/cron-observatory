// Display formatting: relative times, durations, absolute clocks.
// One place, so tables and detail views agree on every string.
export function relTime(iso, now = new Date()) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  const diff = Math.round((now.getTime() - then) / 1000);
  const abs = Math.abs(diff);
  const past = diff >= 0;
  if (abs < 60) return "just now";
  if (abs < 3600) {
    const m = Math.floor(abs / 60);
    return past ? `${m}m ago` : `in ${m}m`;
  }
  if (abs < 86400) {
    const h = Math.floor(abs / 3600);
    return past ? `${h}h ago` : `in ${h}h`;
  }
  const d = Math.floor(abs / 86400);
  return past ? `${d}d ago` : `in ${d}d`;
}

export function fmtDuration(ms) {
  if (ms == null) return null;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)}s`;
  if (ms < 3600000) {
    const m = Math.floor(ms / 60000);
    const s = Math.round((ms % 60000) / 1000);
    return s ? `${m}m ${s}s` : `${m}m`;
  }
  const h = Math.floor(ms / 3600000);
  const m = Math.round((ms % 3600000) / 60000);
  return m ? `${h}h ${m}m` : `${h}h`;
}

// Absolute timestamp for detail views and log rows.
export function fmtClock(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

export function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

// A missing value renders as a grey dash, never a spinner.
export function dash(value) {
  return value ?? "—";
}
