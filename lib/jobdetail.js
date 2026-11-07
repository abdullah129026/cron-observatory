// Job detail data: stats, run history (with synthetic missed rows),
// alert history. Shared by the jobs API routes and the job detail
// page, so the page and the API can never disagree.
import { statusFor } from "./jobview.js";
import { percentile, withSyntheticMissed } from "./state.js";

export async function getJobDetail(store, job, now = new Date()) {
  const since30d = new Date(now.getTime() - 30 * 86400000).toISOString();
  const window = await store.listRunsInWindow(job.id, since30d);
  const finished = window.filter((r) => r.status === "success" || r.status === "failed");
  const durations = window.filter((r) => r.status === "success" && r.duration_ms != null)
    .map((r) => r.duration_ms);
  const openAlerts = await store.listAlertsForJob(job.id, 100);
  const openCount = openAlerts.filter((a) => !a.resolved_at).length;
  const lastRun = (await store.listRunsForJob(job.id, 1, 0)).rows[0] ?? null;
  const running = window.some((r) => r.status === "running");
  const { status, nextExpected } = statusFor(job, {
    lastRun,
    hasFinishedRun: window.some((r) => r.status !== "running"),
    openAlertKind: openAlerts.find((a) => !a.resolved_at)?.kind ?? null,
    hasRunningRun: running,
  }, now);
  return {
    status,
    next_expected_run: nextExpected?.toISOString() ?? null,
    stats: {
      success_rate_30d: finished.length ? finished.filter((r) => r.status === "success").length / finished.length : null,
      p95_duration_ms_30d: percentile(durations, 0.95),
      executions_30d: window.length,
      open_alerts: openCount,
    },
  };
}

export async function getJobRuns(store, jobId, offset = 0) {
  const limit = 25;
  const { rows, total } = await store.listRunsForJob(jobId, limit, offset);
  const alerts = await store.listAlertsForJob(jobId, 100);
  const missed = alerts.filter((a) => a.kind === "missed");
  const merged = withSyntheticMissed(rows, missed);
  const alertHistory = alerts.slice(0, 25).map((a) => ({
    id: a.id,
    kind: a.kind,
    created_at: a.created_at,
    message: a.message,
    sent_at: a.sent_at,
    send_failed: a.send_failed,
    resolved_at: a.resolved_at,
  }));
  return { runs: merged, total: total + missed.length, alerts: alertHistory };
}
