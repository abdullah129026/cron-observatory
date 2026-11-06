// POST /v1/runs/start — the SDK's start ping. Validates the key,
// writes the run row, returns fast. Slack fanout and alert sends
// never run in this path (PLAN ADR 2).
import { createStore } from "@/lib/store.js";
import { authenticateKey, startRun } from "@/lib/ingest.js";
import { checkRateLimit } from "@/lib/rate.js";
import { readJson, ok, err, routeError, InputError } from "@/lib/http.js";
import { isConfigured } from "@/lib/db.js";

export async function POST(req) {
  try {
    const body = await readJson(req);
    if (!isConfigured()) return err("unconfigured", "Service is not configured yet.", 503);
    const store = createStore();
    const rawKey = req.headers.get("x-api-key");
    const key = await authenticateKey(store, rawKey);
    const rl = checkRateLimit(key.key_hash);
    if (!rl.allowed) {
      return err("rate_limited", "Slow down: 60 pings per minute per key.", 429);
    }
    const { run, created, dropped } = await startRun(store, key, body);
    if (dropped) return ok({ status: "dropped", reason: "job_deleted" });
    return ok({ run_id: run.id, run_uuid: run.run_uuid, created }, 200);
  } catch (e) {
    if (e instanceof InputError && e.code === "job_limit_reached") {
      return err(e.code, e.message, 429);
    }
    return routeError(e);
  }
}
