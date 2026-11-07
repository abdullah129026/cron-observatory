// Dashboard job rows: one row per job with derived status, last run,
// next expected run, 7-day avg duration, consecutive failures, and
// the 30-day tick strip. Shared by the jobs API route and the
// dashboard page, so the table and the API can never disagree.
import { statusFor } from "./jobview.js";
import { consecutiveFailures, tickStrip } from "./state.js";

const URGENCY = { down: 0, timed_out: 1, late: 2, up: 3, new: 4 };

export async function listJobRows(store, projectId, now = new Date()) {
  const rows = await store.listJobsByProject(projectId);
  const since7d = new Date(now.getTime() - 7 * 86400000).toISOString();
  const since30d = new Date(now.getTime() - 30 * 86400000).toISOString();
  const jobs = [];
  for (const info of rows) {
    const { job, lastRun } = info;
    const { status, nextExpected } = statusFor(job, info, now);
    const window = await store.listRunsInWindow(job.id, since30d);
    const last7d = window.filter((r) => r.started_at >= since7d && r.status === "success" && r.duration_ms != null);
    const avg7d = last7d.length
      ? Math.round(last7d.reduce((s, r) => s + r.duration_ms, 0) / last7d.length)
      : null;
    const missed = (await store.listAlertsForJob(job.id, 100))
      .filter((a) => a.kind === "missed");
    const recent = (await store.listRunsForJob(job.id, 25, 0)).rows;
    jobs.push({
      id: job.id,
      name: job.name,
      status,
      schedule: job.schedule_kind === "cron" ? job.cron_expr : job.schedule_kind === "interval" ? `every ${job.period_seconds}s` : null,
      timezone: job.timezone,
      failures: consecutiveFailures(recent),
      last_run_at: lastRun?.started_at ?? null,
      next_expected_run: nextExpected?.toISOString() ?? null,
      avg_duration_ms_7d: avg7d,
      tick_strip: tickStrip(window, missed, 30, now),
    });
  }
  // Fixed urgency sort (docs 2): Down, Timed-out, Late, then name.
  jobs.sort((a, b) => (URGENCY[a.status] - URGENCY[b.status]) || a.name.localeCompare(b.name));
  return jobs;
}
