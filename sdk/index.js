// Cron Job Observatory SDK. Zero dependencies, plain Node.
// Usage:
//   import { wrap } from "./index.js";
//   await wrap("nightly-backup", { schedule: "0 3 * * *", timezone: "Asia/Karachi" }, runBackup);
//
// Rules (PLAN 0.1 + ADR 6): wrap must be awaited; pings never throw
// and never stall the job (10s timeout, 3 retries, then a diagnostic
// on stderr); a 429 is non-retryable; process.exit() inside a wrapped
// job is unsupported (in-flight pings die with the process).
const DEFAULT_BASE_URL = "https://cron-observatory.vercel.app";
const PING_TIMEOUT_MS = 10000;
const MAX_LOG_CHARS = 2000;

const config = {
  apiKey: process.env.CRON_API_KEY ?? null,
  baseUrl: process.env.CRON_BASE_URL ?? DEFAULT_BASE_URL,
};

export function configure(opts = {}) {
  if (opts.apiKey !== undefined) config.apiKey = opts.apiKey;
  if (opts.baseUrl !== undefined) config.baseUrl = opts.baseUrl;
  return { ...config };
}

function diag(message) {
  console.error(`[cron-observatory] ${message}`);
}

async function ping(path, body) {
  if (!config.apiKey) {
    diag("no API key set (CRON_API_KEY or configure({ apiKey })). Ping skipped.");
    return { ok: false, skipped: true };
  }
  const url = `${config.baseUrl.replace(/\/$/, "")}${path}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), PING_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": config.apiKey },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (res.status === 429) {
        diag(`ping rate-limited or job limit reached (HTTP 429). Not retrying.`);
        return { ok: false, status: 429 };
      }
      if (res.ok) return { ok: true, status: res.status };
      diag(`ping failed (HTTP ${res.status}).`);
      return { ok: false, status: res.status };
    } catch (e) {
      if (attempt === 3) diag(`ping failed after 3 attempts: ${e?.message ?? e}`);
    } finally {
      clearTimeout(timer);
    }
    await new Promise((r) => setTimeout(r, 500 * attempt));
  }
  return { ok: false };
}

// Capture console output while fn runs, so a failed run ships the
// log excerpt the alert links to. Restored in finally, always.
function captureLogs() {
  const lines = [];
  const methods = ["log", "info", "warn", "error"];
  const originals = {};
  for (const m of methods) {
    originals[m] = console[m];
    console[m] = (...args) => {
      lines.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
      originals[m](...args);
    };
  }
  return {
    text() {
      return lines.join("\n").slice(0, MAX_LOG_CHARS);
    },
    restore() {
      for (const m of methods) console[m] = originals[m];
    },
  };
}

export async function wrap(name, opts, fn) {
  if (typeof opts === "function") {
    fn = opts;
    opts = {};
  }
  if (typeof name !== "string" || !name) throw new Error("wrap: job name is required");
  if (typeof fn !== "function") throw new Error("wrap: a function to run is required");

  const runUuid = crypto.randomUUID();
  const startBody = { job: name, run_uuid: runUuid };
  if (opts.schedule !== undefined) startBody.schedule = opts.schedule;
  if (opts.timezone !== undefined) startBody.timezone = opts.timezone;
  await ping("/v1/runs/start", startBody);

  const logs = captureLogs();
  try {
    const result = await fn();
    logs.restore();
    await ping("/v1/runs/finish", { run_uuid: runUuid, ok: true });
    return result;
  } catch (err) {
    logs.restore();
    const message = err instanceof Error ? err.message : String(err);
    await ping("/v1/runs/finish", {
      run_uuid: runUuid,
      ok: false,
      error: message.slice(0, 2000),
      log_excerpt: [message, logs.text()].filter(Boolean).join("\n").slice(0, MAX_LOG_CHARS),
    });
    throw err; // the job's error still propagates; only pings are swallowed
  }
}
