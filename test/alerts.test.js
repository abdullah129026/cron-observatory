// Project-scoped alert retry: only that project's unsent alerts
// are attempted, and a send is counted only when Slack accepts it.
import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryStore } from "./helpers.js";
import { retryUnsentForProject } from "../lib/alerts.js";

const loadContext = async (alert) => ({ jobName: "job-a", projectName: "A", jobId: alert.job_id });

test("retryUnsentForProject: sends only the project's alerts", async () => {
  const store = createMemoryStore();
  const a = await store.createProject("owner-1", "A");
  const b = await store.createProject("owner-1", "B");
  const jobA = await store.createJob(a.id, { name: "job-a", schedule_kind: "none" });
  const jobB = await store.createJob(b.id, { name: "job-b", schedule_kind: "none" });
  // Slack is stubbed: every send is accepted.
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, status: 200 });
  try {
    store.setWebhook(a.id, "https://hooks.example.com/a");
    store.setWebhook(b.id, "https://hooks.example.com/b");
    await store.claimAlert({ project_id: a.id, job_id: jobA.id, kind: "failure", message: "A failed" });
    await store.claimAlert({ project_id: b.id, job_id: jobB.id, kind: "failure", message: "B failed" });

    const result = await retryUnsentForProject(store, a.id, loadContext);
    assert.deepEqual(result, { attempted: 1, sent: 1 });
    assert.equal(await store.countUnsentAlerts(a.id), 0);
    assert.equal(await store.countUnsentAlerts(b.id), 1);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("retryUnsentForProject: no webhook leaves the alert queued", async () => {
  const store = createMemoryStore();
  const a = await store.createProject("owner-1", "A");
  const jobA = await store.createJob(a.id, { name: "job-a", schedule_kind: "none" });
  await store.claimAlert({ project_id: a.id, job_id: jobA.id, kind: "failure", message: "A failed" });

  const result = await retryUnsentForProject(store, a.id, loadContext);
  assert.deepEqual(result, { attempted: 1, sent: 0 });
  assert.equal(await store.countUnsentAlerts(a.id), 1);
});
