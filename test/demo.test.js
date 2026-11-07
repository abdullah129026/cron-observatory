// Demo strip: real demo data only, hollow ticks until the seed exists.
import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryStore } from "./helpers.js";

test("getDemoStrip: null without a demo project, strip with one", async () => {
  const store = createMemoryStore();
  assert.equal(await store.getDemoStrip(), null);

  const project = await store.createProject("owner-1", "demo");
  const job = await store.createJob(project.id, {
    name: "nightly-backup", schedule_kind: "cron",
    cron_expr: "0 3 * * *", timezone: "Asia/Karachi",
  });
  const now = Date.now();
  await store.createRun({
    project_id: project.id, job_id: job.id, run_uuid: "u1",
    started_at: new Date(now - 86400000).toISOString(),
    finished_at: new Date(now - 86400000 + 60000).toISOString(),
    status: "failed", duration_ms: 60000,
    exit_error: "Error: boom", log_excerpt: "line one\nError: boom",
  });
  await store.claimAlert({
    project_id: project.id, job_id: job.id, kind: "failure",
    message: "Cron job failed: nightly-backup (demo)",
  });

  const demo = await store.getDemoStrip();
  assert.equal(demo.jobName, "nightly-backup");
  assert.equal(demo.strip.length, 30);
  assert.equal(demo.strip[28].status, "down");
  assert.equal(demo.failure.exit_error, "Error: boom");
  assert.equal(demo.alert.kind, "failure");
});
