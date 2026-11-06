import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createMemoryStore, seedProjectKey } from "./helpers.js";
import { authenticateKey, startRun, finishRun } from "../lib/ingest.js";
import { checkRateLimit, resetRateLimits } from "../lib/rate.js";

async function setup() {
  const store = createMemoryStore();
  const { project, key, raw } = await seedProjectKey(store);
  return { store, project, key, raw };
}

test("ingest: start auto-registers a New job and finish turns it green", async () => {
  const { store, key } = await setup();
  const runUuid = crypto.randomUUID();
  const started = await startRun(store, key, { job: "nightly-backup", run_uuid: runUuid, schedule: "0 3 * * *", timezone: "Asia/Karachi" }, new Date("2026-11-06T09:00:00Z"));
  assert.equal(started.created, true);
  assert.equal(started.job.name, "nightly-backup");
  assert.equal(started.job.schedule_kind, "cron");
  assert.equal(started.job.cron_expr, "0 3 * * *");
  const finished = await finishRun(store, key, { run_uuid: runUuid, ok: true }, new Date("2026-11-06T09:01:00Z"));
  assert.equal(finished.outcome, "success");
  assert.equal(finished.run.status, "success");
  assert.equal(finished.run.duration_ms, 60000);
});

test("flaky_ping_retry_idempotent: same run_uuid twice makes one run", async () => {
  const { store, key } = await setup();
  const runUuid = crypto.randomUUID();
  const first = await startRun(store, key, { job: "backup", run_uuid: runUuid }, new Date("2026-11-06T09:00:00Z"));
  const retry = await startRun(store, key, { job: "backup", run_uuid: runUuid }, new Date("2026-11-06T09:00:05Z"));
  assert.equal(retry.created, false);
  assert.equal(retry.run.id, first.run.id);
  assert.equal(store._runs.length, 1);
});

test("ingest: failure claims one alert, second failure does not open another", async () => {
  const { store, key } = await setup();
  const u1 = crypto.randomUUID();
  await startRun(store, key, { job: "backup", run_uuid: u1 }, new Date("2026-11-06T09:00:00Z"));
  const f1 = await finishRun(store, key, { run_uuid: u1, ok: false, error: "boom" }, new Date("2026-11-06T09:01:00Z"));
  assert.equal(f1.outcome, "failed");
  assert.ok(f1.alert);
  const u2 = crypto.randomUUID();
  await startRun(store, key, { job: "backup", run_uuid: u2 }, new Date("2026-11-06T09:05:00Z"));
  const f2 = await finishRun(store, key, { run_uuid: u2, ok: false, error: "boom again" }, new Date("2026-11-06T09:06:00Z"));
  assert.equal(f2.alert, null); // open alert already exists
  assert.equal(store._alerts.length, 1);
});

test("alert_rearm: success resolves the alert, the next failure alerts again", async () => {
  const { store, key } = await setup();
  const u1 = crypto.randomUUID();
  await startRun(store, key, { job: "backup", run_uuid: u1 }, new Date("2026-11-06T09:00:00Z"));
  await finishRun(store, key, { run_uuid: u1, ok: false, error: "boom" }, new Date("2026-11-06T09:01:00Z"));
  assert.equal(store._alerts.filter((a) => !a.resolved_at).length, 1);
  const u2 = crypto.randomUUID();
  await startRun(store, key, { job: "backup", run_uuid: u2 }, new Date("2026-11-06T09:05:00Z"));
  const okRun = await finishRun(store, key, { run_uuid: u2, ok: true }, new Date("2026-11-06T09:06:00Z"));
  assert.equal(okRun.resolved.length, 1);
  assert.equal(store._alerts.filter((a) => !a.resolved_at).length, 0);
  const u3 = crypto.randomUUID();
  await startRun(store, key, { job: "backup", run_uuid: u3 }, new Date("2026-11-06T09:10:00Z"));
  const f3 = await finishRun(store, key, { run_uuid: u3, ok: false, error: "boom again" }, new Date("2026-11-06T09:11:00Z"));
  assert.ok(f3.alert); // re-armed
  assert.equal(store._alerts.length, 2);
});

test("ingest: finish for an unknown run_uuid is 404", async () => {
  const { store, key } = await setup();
  await assert.rejects(
    finishRun(store, key, { run_uuid: crypto.randomUUID(), ok: true }),
    (e) => e.code === "not_found" && e.status === 404
  );
});

test("ingest: bad key is 401, missing schedule timezone is rejected", async () => {
  const { store, key, raw } = await setup();
  await assert.rejects(authenticateKey(store, "co_wrong"), (e) => e.code === "unauthorized" && e.status === 401);
  await assert.rejects(authenticateKey(store, null), (e) => e.code === "unauthorized");
  const good = await authenticateKey(store, raw);
  assert.equal(good.project_id, key.project_id);
  await assert.rejects(
    startRun(store, key, { job: "x", timezone: "Asia/Karachi" }),
    (e) => e.code === "bad_request"
  );
  await assert.rejects(
    startRun(store, key, { job: "x", schedule: "not a cron" }),
    (e) => e.code === "bad_request"
  );
  await assert.rejects(
    startRun(store, key, { job: "x", schedule: "0 3 * * *", timezone: "Nowhere/Special" }),
    (e) => e.code === "bad_request"
  );
});

test("ingest: 11th job hits the account cap", async () => {
  const { store, key } = await setup();
  for (let i = 0; i < 10; i++) {
    await startRun(store, key, { job: `job-${i}`, run_uuid: crypto.randomUUID() }, new Date("2026-11-06T09:00:00Z"));
  }
  await assert.rejects(
    startRun(store, key, { job: "job-10", run_uuid: crypto.randomUUID() }, new Date("2026-11-06T09:00:00Z")),
    (e) => e.code === "job_limit_reached" && e.status === 429
  );
});

test("ingest: pings for a deleted job name are dropped", async () => {
  const { store, key } = await setup();
  const u1 = crypto.randomUUID();
  const started = await startRun(store, key, { job: "old-job", run_uuid: u1 }, new Date("2026-11-06T09:00:00Z"));
  await store.updateJob(started.job.id, { deleted_at: new Date().toISOString() });
  const dropped = await startRun(store, key, { job: "old-job", run_uuid: crypto.randomUUID() }, new Date("2026-11-06T09:05:00Z"));
  assert.equal(dropped.dropped, true);
  assert.equal(store._runs.length, 1);
});

test("ingest: late finish after a timeout keeps timed_out and sends nothing", async () => {
  const { store, key } = await setup();
  const u1 = crypto.randomUUID();
  await startRun(store, key, { job: "slow", run_uuid: u1 }, new Date("2026-11-06T09:00:00Z"));
  const run = store._runs[0];
  await store.finishRun(run.id, { status: "timed_out", duration_ms: 3600000 });
  const late = await finishRun(store, key, { run_uuid: u1, ok: true }, new Date("2026-11-06T10:05:00Z"));
  assert.equal(late.outcome, "late_finish");
  assert.equal(late.run.status, "timed_out");
  assert.deepEqual(late.resolved, []);
});

test("rate limit: 60 per minute, then blocked", () => {
  resetRateLimits();
  const hash = "test-key-hash";
  for (let i = 0; i < 60; i++) assert.equal(checkRateLimit(hash, 1000).allowed, true);
  assert.equal(checkRateLimit(hash, 1000).allowed, false);
  assert.equal(checkRateLimit(hash, 61001).allowed, true); // next window
});
