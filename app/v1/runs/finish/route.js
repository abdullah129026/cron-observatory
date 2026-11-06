// POST /v1/runs/finish — the SDK's finish ping. A failure claims
// its alert row and the Slack send runs in after(); a success
// resolves open alerts and sends one recovery message when any
// alert was resolved.
import { after } from "next/server";
import { createStore } from "@/lib/store.js";
import { authenticateKey, finishRun } from "@/lib/ingest.js";
import { checkRateLimit } from "@/lib/rate.js";
import { readJson, ok, err, routeError } from "@/lib/http.js";
import { isConfigured } from "@/lib/db.js";
import { sendAlert, alertText } from "@/lib/alerts.js";
import { sendSlack } from "@/lib/slack.js";
import { event } from "@/lib/log.js";

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
    const result = await finishRun(store, key, body);
    const { run, job, outcome, alert, resolved } = result;

    if (outcome === "failed" && alert) {
      after(async () => {
        const claimed = await store.claimAlertSend(alert.id);
        if (!claimed) return; // another isolate owns this send
        const text = alertText("failure", {
          jobName: job.name, projectName: key.project.name ?? "", jobId: job.id,
          startedAt: run.started_at, logExcerpt: run.log_excerpt,
        });
        await sendAlert(store, claimed, text);
      });
    }
    if (outcome === "success" && resolved.length > 0) {
      after(async () => {
        const project = await store.getProjectById(job.project_id);
        const text = alertText("recovery", {
          jobName: job.name, projectName: project?.name ?? "", jobId: job.id,
        });
        // Recovery is a fresh message, not an alert row: send it
        // directly and record the outcome as an event.
        const webhook = await store.getProjectWebhook(job.project_id);
        if (!webhook) return;
        const res = await sendSlack(webhook, text);
        event(res.ok ? "alert_recovered" : "alert_delivery_failed", { job_id: job.id });
      });
    }
    return ok({ run_id: run.id, status: run.status, outcome });
  } catch (e) {
    return routeError(e);
  }
}
