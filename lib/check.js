// The check tick: missed-run and stuck-run detection, run every
// 60s by pg_cron via /api/cron/check. Every tick recomputes from
// expected times, so a failed tick or a Vercel outage self-heals on
// the next successful tick; only alert latency suffers, never
// correctness (PLAN 0.3).
import { cronWindow, intervalWindow } from "./cronmath.js";
import { alertText, retryUnsentAlerts } from "./alerts.js";
import { log } from "./log.js";

// One tick. store is the store interface; send is injected so tests
// can stub Slack (production passes the real sender from alerts.js).
async function projectName(store, projectId) {
  const p = await store.getProjectById(projectId);
  return p?.name ?? "";
}

export async function runCheck(store, send, now = new Date()) {
  const summary = { checked: 0, late: 0, down: 0, timeouts: 0, alerts_sent: 0 };
  const jobs = await store.listJobsForCheck();

  for (const { job, lastRun, runningRuns, openAlerts } of jobs) {
    summary.checked++;
    const hasOpenMissed = openAlerts.some((a) => a.kind === "missed");
    const hasOpenTimeout = openAlerts.some((a) => a.kind === "timeout");

    // Stuck runs: a start with no finish past max_runtime becomes
    // timed out, distinct from missed (PLAN 0.0).
    for (const run of runningRuns) {
      const ageMs = now.getTime() - new Date(run.started_at).getTime();
      if (ageMs <= job.max_runtime_seconds * 1000) continue;
      await store.finishRun(run.id, { status: "timed_out", duration_ms: ageMs });
      summary.timeouts++;
      if (!hasOpenTimeout) {
        const alert = await store.claimAlert({
          project_id: job.project_id, job_id: job.id, run_id: run.id,
          kind: "timeout",
          message: alertText("timeout", {
            jobName: job.name, projectName: await projectName(store, job.project_id),
            jobId: job.id,
            runtimeSeconds: Math.round(ageMs / 1000), maxRuntime: job.max_runtime_seconds,
          }),
        });
        if (alert && (await send(store, alert))) summary.alerts_sent++;
      }
    }

    // Missed runs: expected schedule vs actual pings.
    if (!lastRun) continue; // no runs yet: New, excluded from sweep
    const window = job.schedule_kind === "cron"
      ? cronWindow(job.cron_expr, job.timezone, now)
      : intervalWindow(lastRun.started_at ? new Date(lastRun.started_at) : null, job.period_seconds, now);
    if (!window.last) continue;
    const lastStart = new Date(lastRun.started_at);
    const covered = lastStart.getTime() >= window.last.getTime();
    if (covered) {
      if (window.next) await store.updateJob(job.id, { expected_next_run: window.next.toISOString() });
      continue;
    }
    // No run in the last expected window. Inside grace: Late, never
    // alerts. Past grace: Down, one missed alert (claim-then-send).
    const graceMs = job.grace_seconds * 1000;
    if (now.getTime() <= window.last.getTime() + graceMs) {
      summary.late++;
      continue;
    }
    summary.down++;
    if (hasOpenMissed) continue;
    const alert = await store.claimAlert({
      project_id: job.project_id, job_id: job.id, run_id: null,
      kind: "missed",
      message: alertText("missed", {
        jobName: job.name, projectName: await projectName(store, job.project_id),
        jobId: job.id,
        expectedAt: window.last.toISOString(),
        lastSeenAt: lastStart.toISOString(),
      }),
    });
    if (alert && (await send(store, alert))) summary.alerts_sent++;
    if (window.next) await store.updateJob(job.id, { expected_next_run: window.next.toISOString() });
  }

  // Retry anything still unsent (crashed isolates, Slack outages).
  const retry = await retryUnsentAlerts(store, async (alert) => {
    const job = await store.getJobById(alert.job_id);
    if (!job) return null;
    return { jobName: job.name, projectName: await projectName(store, job.project_id), jobId: job.id };
  });
  summary.alerts_sent += retry.sent;

  await store.updateMetaCheck(now);
  log("info", "check tick done", summary);
  return summary;
}
