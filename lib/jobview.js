// Job view model: derived status plus expected runs, shared by the
// dashboard jobs list and the job detail route.
import { cronWindow, intervalWindow } from "./cronmath.js";
import { deriveStatus } from "./state.js";

export function expectedFor(job, lastRunStartedAt, now) {
  if (job.schedule_kind === "cron" && job.cron_expr) {
    return cronWindow(job.cron_expr, job.timezone, now);
  }
  if (job.schedule_kind === "interval" && job.period_seconds) {
    return intervalWindow(
      lastRunStartedAt ? new Date(lastRunStartedAt) : null,
      job.period_seconds,
      now
    );
  }
  return { last: null, next: null };
}

export function statusFor(job, info, now = new Date()) {
  const win = expectedFor(job, info.lastRun?.started_at, now);
  return {
    status: deriveStatus(
      {
        hasFinishedRun: info.hasFinishedRun ?? Boolean(info.lastRun && info.lastRun.status !== "running"),
        hasSchedule: job.schedule_kind !== "none",
        openAlertKind: info.openAlertKind ?? null,
        hasRunningRun: info.hasRunningRun ?? false,
        lastExpected: win.last,
        graceSeconds: job.grace_seconds,
      },
      now
    ),
    nextExpected: win.next,
    lastExpected: win.last,
  };
}
