// Structured logging. One JSON object per line, so Vercel log drains
// can filter on level and msg. Never log secrets, keys, or webhook URLs.
export function log(level, msg, fields = {}) {
  const line = { ts: new Date().toISOString(), level, msg, ...fields };
  if (level === "error") console.error(JSON.stringify(line));
  else console.log(JSON.stringify(line));
}

// Analytics events (PLAN 0.5). No analytics provider in v1, so the
// log is the sink: events are queryable in the log drain, and a real
// sink later is one function change, not a retrofit.
export function event(name, fields = {}) {
  log("info", "analytics", { event: name, ...fields });
}
