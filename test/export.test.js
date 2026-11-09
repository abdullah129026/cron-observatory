// Export and account-delete flows: the export carries metadata only
// (never a raw key, key hash, or webhook URL) and delete soft-deletes
// the owner's projects, jobs, and keys while leaving other owners alone.
import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryStore, seedProjectKey } from "./helpers.js";

test("export carries metadata only, scoped to the owner", async () => {
  const store = createMemoryStore();
  const { project, key, raw } = await seedProjectKey(store, "owner-1");
  store.setWebhook(project.id, "https://hooks.slack.com/services/T/SECRET");
  const job = await store.createJob(project.id, { name: "nightly-backup", schedule_kind: "cron", cron_expr: "0 3 * * *", timezone: "UTC" });
  const { run } = await store.createRun({ project_id: project.id, job_id: job.id, run_uuid: "uuid-1", started_at: new Date().toISOString(), status: "failed", exit_error: "boom" });
  await store.claimAlert({ project_id: project.id, job_id: job.id, run_id: run.id, kind: "failure" });
  const other = await seedProjectKey(store, "owner-2");

  const data = await store.exportForOwner("owner-1");
  assert.equal(data.projects.length, 1);
  const mine = data.projects[0];
  assert.equal(mine.id, project.id);
  assert.equal(mine.jobs.length, 1);
  assert.equal(mine.runs.length, 1);
  assert.equal(mine.alerts.length, 1);
  assert.equal(mine.api_keys.length, 1);
  assert.equal(mine.api_keys[0].name, "test key");
  assert.equal(mine.slack_webhook_present, true);
  // Nothing secret survives the export, in any field. The wire format
  // is JSON, and undefined values are dropped by stringify, so check
  // the serialized export (what actually leaves the server).
  const flat = JSON.stringify(data);
  assert.ok(!flat.includes("slack_webhook_enc"), "webhook field leaked into export");
  assert.ok(!flat.includes(raw), "raw key leaked into export");
  assert.ok(!flat.includes(key.key_hash), "key hash leaked into export");
  assert.ok(!flat.includes("hooks.slack.com"), "webhook URL leaked into export");
  assert.ok(!data.projects.some((p) => p.id === other.project.id), "other owner exported");
});

test("deleteAccountData soft-deletes only the owner's data", async () => {
  const store = createMemoryStore();
  const { project } = await seedProjectKey(store, "owner-1");
  const job = await store.createJob(project.id, { name: "nightly-backup", schedule_kind: "cron", cron_expr: "0 3 * * *", timezone: "UTC" });
  store.setWebhook(project.id, "https://hooks.slack.com/services/T/SECRET");
  const other = await seedProjectKey(store, "owner-2");
  const otherJob = await store.createJob(other.project.id, { name: "other-job", schedule_kind: "cron", cron_expr: "0 3 * * *", timezone: "UTC" });

  await store.deleteAccountData("owner-1");
  assert.equal((await store.listProjectsByOwner("owner-1")).length, 0);
  assert.equal(store._projects.find((p) => p.id === project.id).deleted_at !== null, true);
  assert.equal(store._jobs.find((j) => j.id === job.id).deleted_at !== null, true);
  assert.equal(store._keys.find((k) => k.project_id === project.id).revoked_at !== null, true);
  assert.equal(store._keys.find((k) => k.project_id === project.id).deleted_at !== null, true);
  assert.equal(await store.getProjectWebhook(project.id), null);
  // The other owner is untouched.
  assert.equal((await store.listProjectsByOwner("owner-2")).length, 1);
  assert.equal(store._jobs.find((j) => j.id === otherJob.id).deleted_at, null);
});
