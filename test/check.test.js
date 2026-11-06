import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createMemoryStore, seedProjectKey } from "./helpers.js";
import { startRun, finishRun } from "../lib/ingest.js";
import { runCheck } from "../lib/check.js";

async function setupJob({ schedule = "0 3 * * *", timezone = "Asia/Karachi", grace = 300, maxRuntime = 3600, lastRunAt = "2026-11-04T22:00:00Z", lastStatus = "success" } = {}) {
  const store = createMemoryStore();
  const { project, key } = await seedProjectKey(store);
  const job = await store.createJob(project.id, {
    name: "nightly-backup", schedule_kind: "cron", cron_expr: schedule,
    timezone, period_seconds: null, grace_seconds: grace, max_runtime_seconds: maxRuntime,
  });
  if (lastRunAt) {
    await store.createRun({
      project_id: project.id, job_id: job.id, run_uuid: crypto.randomUUID(),
      started_at: lastRunAt, finished_at: lastRunAt, status: lastStatus,
      duration_ms: 60000,
    });
  }
  return { store, project, key, job };
}

test("grace_boundary: Late inside grace, Down past it, one alert", async () => {
  const { store, job } = await setupJob();
  const sent = [];
  const send = async (s, alert) => { sent.push(alert); return true; };
  // 22:04 PKT-side: last expected 22:00 Nov 5, 4 min in, grace is 5 min.
  const late = await runCheck(store, send, new Date("2026-11-05T22:04:00Z"));
  assert.equal(late.late, 1);
  assert.equal(late.down, 0);
  assert.equal(store._alerts.length, 0);
  // 22:06: past grace, Down with exactly one missed alert + one send.
  const down = await runCheck(store, send, new Date("2026-11-05T22:06:00Z"));
  assert.equal(down.down, 1);
  assert.equal(store._alerts.length, 1);
  assert.equal(store._alerts[0].kind, "missed");
  assert.equal(sent.length, 1);
});

test("alert_dedupe: a second tick does not re-alert an open incident", async () => {
  const { store } = await setupJob();
  const sent = [];
  const send = async (s, alert) => { sent.push(alert); return true; };
  await runCheck(store, send, new Date("2026-11-05T22:06:00Z"));
  await runCheck(store, send, new Date("2026-11-05T22:07:00Z"));
  await runCheck(store, send, new Date("2026-11-05T22:08:00Z"));
  assert.equal(store._alerts.length, 1);
  assert.equal(sent.length, 1);
});

test("alert_rearm: recovery re-arms, the next miss alerts again", async () => {
  const { store, key, job } = await setupJob();
  const sent = [];
  const send = async (s, alert) => { sent.push(alert); return true; };
  await runCheck(store, send, new Date("2026-11-05T22:06:00Z"));
  assert.equal(store._alerts.length, 1);
  // The job runs again: start resolves the missed alert, finish success recovers.
  const u = crypto.randomUUID();
  await startRun(store, key, { job: "nightly-backup", run_uuid: u }, new Date("2026-11-06T09:00:00Z"));
  assert.equal(store._alerts.filter((a) => !a.resolved_at).length, 0);
  await finishRun(store, key, { run_uuid: u, ok: true }, new Date("2026-11-06T09:01:00Z"));
  // Next day the job misses again: a second, distinct alert.
  const again = await runCheck(store, send, new Date("2026-11-07T22:06:00Z"));
  assert.equal(again.down, 1);
  assert.equal(store._alerts.length, 2);
  assert.equal(sent.length, 2);
});

test("stuck_run_timeout: start with no finish past max_runtime is timed out", async () => {
  const { store, job } = await setupJob({ lastRunAt: null });
  await store.createRun({
    project_id: job.project_id, job_id: job.id, run_uuid: crypto.randomUUID(),
    started_at: "2026-11-06T07:00:00Z", status: "running",
  });
  const sent = [];
  const send = async (s, alert) => { sent.push(alert); return true; };
  const summary = await runCheck(store, send, new Date("2026-11-06T09:00:00Z"));
  assert.equal(summary.timeouts, 1);
  assert.equal(store._runs[0].status, "timed_out");
  assert.equal(store._alerts.length, 1);
  assert.equal(store._alerts[0].kind, "timeout");
  assert.equal(sent.length, 1);
  // A second tick does not re-fire.
  const again = await runCheck(store, send, new Date("2026-11-06T09:01:00Z"));
  assert.equal(again.timeouts, 0);
  assert.equal(store._alerts.length, 1);
});

test("check: on-schedule job stays quiet and updates expected_next_run", async () => {
  const { store, job } = await setupJob({ lastRunAt: "2026-11-05T22:00:00Z" });
  const send = async () => { throw new Error("must not send"); };
  const summary = await runCheck(store, send, new Date("2026-11-06T10:00:00Z"));
  assert.equal(summary.down, 0);
  assert.equal(summary.late, 0);
  assert.equal(store._jobs[0].expected_next_run, "2026-11-06T22:00:00.000Z");
  assert.ok(store._meta.last_check_at);
});

test("check: New job with no runs is excluded from the sweep", async () => {
  const { store } = await setupJob({ lastRunAt: null });
  const send = async () => { throw new Error("must not send"); };
  const summary = await runCheck(store, send, new Date("2026-11-06T10:00:00Z"));
  assert.equal(summary.checked, 1);
  assert.equal(summary.down, 0);
  assert.equal(store._alerts.length, 0);
});

test("check: unsent alerts retry, and give up after 24 hours", async () => {
  const { store, project, job } = await setupJob();
  store.setWebhook(project.id, "https://hooks.slack.com/test");
  const claimed = await store.claimAlert({
    project_id: project.id, job_id: job.id, run_id: null, kind: "missed", message: "missed",
  });
  assert.ok(claimed);
  const calls = [];
  const realFetch = global.fetch;
  global.fetch = async () => { calls.push(1); return { ok: true, status: 200 }; };
  try {
    await runCheck(store, async () => true, new Date("2026-11-06T10:00:00Z"));
  } finally {
    global.fetch = realFetch;
  }
  assert.equal(calls.length, 1);
  assert.ok(store._alerts[0].sent_at);

  // A failing send on a 25-hour-old alert gives up.
  const old = await store.claimAlert({
    project_id: project.id, job_id: job.id, run_id: null, kind: "failure", message: "failed",
  });
  old.created_at = new Date(Date.now() - 25 * 3600000).toISOString();
  global.fetch = async () => ({ ok: false, status: 500 });
  try {
    await runCheck(store, async () => true, new Date("2026-11-06T10:00:00Z"));
  } finally {
    global.fetch = realFetch;
  }
  assert.equal(old.send_failed, true);
  assert.equal(old.sent_at, null);
});
