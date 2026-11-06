// Slack sender. One function behind the notification abstraction
// (PLAN foresight hook 11): swapping channels later is one function.
// Never log the webhook URL or the full message body with secrets.
const TIMEOUT_MS = 10000;

export async function sendSlack(webhookUrl, text) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: ctrl.signal,
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, error: e?.name === "AbortError" ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
}

// Alert message templates (PLAN 0.1). Text labels, never color alone.
export function failureMessage(jobName, projectName, startedAt, logExcerpt, jobUrl) {
  const lines = [
    `:red_circle: Cron job failed: *${jobName}* (${projectName})`,
    `Started: ${startedAt}`,
    logExcerpt ? `Log: ${logExcerpt.split("\n")[0].slice(0, 500)}` : "",
    jobUrl,
  ];
  return lines.filter(Boolean).join("\n");
}

export function missedMessage(jobName, projectName, expectedAt, lastSeenAt, jobUrl) {
  return [
    `:red_circle: Cron job missed its run: *${jobName}* (${projectName})`,
    `Expected: ${expectedAt}`,
    lastSeenAt ? `Last seen: ${lastSeenAt}` : "Never seen.",
    jobUrl,
  ].join("\n");
}

export function timeoutMessage(jobName, projectName, runtimeSeconds, maxRuntime, jobUrl) {
  return [
    `:red_circle: Cron job timed out: *${jobName}* (${projectName})`,
    `Ran for ${runtimeSeconds}s, limit is ${maxRuntime}s.`,
    jobUrl,
  ].join("\n");
}

export function recoveryMessage(jobName, projectName, jobUrl) {
  return `:white_check_mark: Cron job is green again: *${jobName}* (${projectName})\n${jobUrl}`;
}

export function testMessage(projectName) {
  return `:test_tube: [TEST] Cron Job Observatory test message for ${projectName}. If you can read this, alerts are wired up.`;
}
