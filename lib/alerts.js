// Alert sending: claim-then-send plus the unsent retry sweep.
// The alert row is the durable record; a crashed isolate loses
// nothing, the next tick retries the send (PLAN 0.3).
import { sendSlack, failureMessage, missedMessage, timeoutMessage, recoveryMessage } from "./slack.js";
import { log, event } from "./log.js";

const GIVE_UP_AFTER_MS = 24 * 3600 * 1000;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export function jobUrl(jobId) {
  return `${APP_URL}/jobs/${jobId}`;
}

// Send one claimed alert's message. Returns true when Slack
// accepted it. Updates webhook health counters on the project.
export async function sendAlert(store, alert, text) {
  const webhook = await store.getProjectWebhook(alert.project_id);
  if (!webhook) {
    // No webhook: the alert stays unsent and visible (queued count).
    log("info", "alert has no webhook, left queued", { alert_id: alert.id });
    return false;
  }
  event("alert_sent", { alert_id: alert.id, kind: alert.kind });
  const res = await sendSlack(webhook, text);
  if (res.ok) {
    await store.markAlertSent(alert.id, new Date());
    await store.recordWebhookSuccess(alert.project_id, false);
    event("alert_delivered", { alert_id: alert.id, kind: alert.kind });
    return true;
  }
  const giveUp = Date.now() - new Date(alert.created_at).getTime() > GIVE_UP_AFTER_MS;
  await store.markAlertSendFailed(alert.id, giveUp);
  const failures = await store.recordWebhookFailure(alert.project_id);
  event("alert_delivery_failed", { alert_id: alert.id, kind: alert.kind, status: res.status, consecutive_failures: failures });
  log("error", "slack send failed", { alert_id: alert.id, status: res.status, give_up: giveUp });
  return false;
}

// Build the Slack text for an alert row. Job and project names come
// from the caller; the message is stored on the alert at claim time
// for failure/missed/timeout, and built fresh for recovery.
export function alertText(kind, { jobName, projectName, jobId, startedAt, logExcerpt, expectedAt, lastSeenAt, runtimeSeconds, maxRuntime }) {
  const url = jobUrl(jobId);
  if (kind === "failure") return failureMessage(jobName, projectName, startedAt, logExcerpt, url);
  if (kind === "missed") return missedMessage(jobName, projectName, expectedAt, lastSeenAt, url);
  if (kind === "timeout") return timeoutMessage(jobName, projectName, runtimeSeconds, maxRuntime, url);
  return recoveryMessage(jobName, projectName, url);
}

// Retry every unsent alert (the check tick calls this). Each send is
// claimed atomically first, so two ticks never double-send.
export async function retryUnsentAlerts(store, loadContext) {
  return retryAlerts(store, await store.listUnsentAlerts(), loadContext);
}

// Retry unsent alerts for one project only (the dashboard "Retry
// sends" banner action). Same claim-then-send loop, scoped down.
export async function retryUnsentForProject(store, projectId, loadContext) {
  const unsent = (await store.listUnsentAlerts()).filter((a) => a.project_id === projectId);
  return retryAlerts(store, unsent, loadContext);
}

async function retryAlerts(store, unsent, loadContext) {
  let sent = 0;
  for (const alert of unsent) {
    const claimed = await store.claimAlertSend(alert.id);
    if (!claimed) continue; // another tick owns this send
    const ctx = await loadContext(alert);
    if (!ctx) continue;
    const text = alert.message || alertText(alert.kind, ctx);
    if (await sendAlert(store, claimed, text)) sent++;
  }
  return { attempted: unsent.length, sent };
}
