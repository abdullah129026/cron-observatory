// In-memory fake of the store interface (lib/store.js), for tests.
// Same shapes, same rules: unique run_uuid, one open alert per
// (job, kind), atomic send claims. The SQL itself is verified
// against live Supabase at deploy (phase-6).
import crypto from "node:crypto";
import { tickStrip } from "../lib/state.js";

export function createMemoryStore() {
  const projects = [];
  const keys = [];
  const jobs = [];
  const runs = [];
  const alerts = [];
  const meta = { id: 1, last_check_at: null };
  const webhooks = new Map(); // projectId -> url (plaintext, test-only)

  const byId = (arr, id) => arr.find((r) => r.id === id) ?? null;

  return {
    _projects: projects, _keys: keys, _jobs: jobs, _runs: runs, _alerts: alerts, _meta: meta,
    setWebhook(projectId, url) { webhooks.set(projectId, url); },

    async getKeyByHash(hash) {
      const key = keys.find((k) => k.key_hash === hash && !k.revoked_at && !k.deleted_at);
      if (!key) return null;
      const project = byId(projects, key.project_id);
      if (!project || project.deleted_at) return null;
      return { ...key, project };
    },
    async touchKeyLastUsed(key) {
      const row = byId(keys, key.id);
      if (row) row.last_used_at = new Date().toISOString();
    },
    async countLiveJobsForOwner(ownerId) {
      const pids = new Set(projects.filter((p) => p.owner_id === ownerId && !p.deleted_at).map((p) => p.id));
      return jobs.filter((j) => pids.has(j.project_id) && !j.deleted_at).length;
    },
    async getJobByName(projectId, name) {
      return jobs.find((j) => j.project_id === projectId && j.name === name && !j.deleted_at) ?? null;
    },
    async getDeletedJobByName(projectId, name) {
      return jobs.find((j) => j.project_id === projectId && j.name === name && j.deleted_at) ?? null;
    },
    async getJobById(id) { return byId(jobs, id); },
    async createJob(projectId, fields) {
      const job = { id: crypto.randomUUID(), project_id: projectId, created_at: new Date().toISOString(), deleted_at: null, expected_next_run: null, ...fields };
      jobs.push(job);
      return job;
    },
    async updateJob(id, fields) {
      const job = byId(jobs, id);
      if (job) Object.assign(job, fields);
      return job;
    },
    async createRun(fields) {
      const existing = runs.find((r) => r.run_uuid === fields.run_uuid);
      if (existing) return { run: existing, created: false };
      const run = { id: crypto.randomUUID(), finished_at: null, status: "running", duration_ms: null, exit_error: null, log_excerpt: null, created_at: new Date().toISOString(), ...fields };
      runs.push(run);
      return { run, created: true };
    },
    async getRunByUuid(runUuid) {
      return runs.find((r) => r.run_uuid === runUuid) ?? null;
    },
    async finishRun(id, fields) {
      const run = byId(runs, id);
      if (run) Object.assign(run, fields);
      return run;
    },
    async listRunsForJob(jobId, limit, offset) {
      const rows = runs.filter((r) => r.job_id === jobId)
        .sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
      return { rows: rows.slice(offset, offset + limit), total: rows.length };
    },
    async listRunsInWindow(jobId, sinceIso) {
      return runs.filter((r) => r.job_id === jobId && r.started_at >= sinceIso)
        .sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
    },
    async claimAlert(fields) {
      const open = alerts.find((a) => a.job_id === fields.job_id && a.kind === fields.kind && !a.resolved_at);
      if (open) return null;
      const alert = {
        id: crypto.randomUUID(), run_id: fields.run_id ?? null, channel: "slack",
        message: fields.message ?? "", sent_at: null, sending_started_at: null,
        send_attempts: 0, send_failed: false, resolved_at: null,
        created_at: new Date().toISOString(), ...fields,
      };
      alerts.push(alert);
      return alert;
    },
    async claimAlertSend(id) {
      const alert = byId(alerts, id);
      if (!alert || alert.sent_at || alert.send_failed) return null;
      if (alert.sending_started_at && Date.now() - new Date(alert.sending_started_at).getTime() < 5 * 60000) return null;
      alert.sending_started_at = new Date().toISOString();
      alert.send_attempts += 1;
      return alert;
    },
    async markAlertSent(id, now) {
      const alert = byId(alerts, id);
      if (alert) alert.sent_at = now.toISOString();
    },
    async markAlertSendFailed(id, giveUp) {
      const alert = byId(alerts, id);
      if (alert) { alert.send_failed = giveUp; alert.sending_started_at = null; }
    },
    async resolveOpenAlerts(jobId) {
      const now = new Date().toISOString();
      const resolved = alerts.filter((a) => a.job_id === jobId && !a.resolved_at);
      for (const a of resolved) a.resolved_at = now;
      return resolved;
    },
    async resolveAlertKind(jobId, kind) {
      const now = new Date().toISOString();
      const resolved = alerts.filter((a) => a.job_id === jobId && a.kind === kind && !a.resolved_at);
      for (const a of resolved) a.resolved_at = now;
      return resolved;
    },
    async listUnsentAlerts() {
      return alerts.filter((a) => !a.sent_at && !a.send_failed)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).slice(0, 100);
    },
    async listAlertsForJob(jobId, limit) {
      return alerts.filter((a) => a.job_id === jobId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, limit);
    },
    async countUnsentAlerts(projectId) {
      return alerts.filter((a) => a.project_id === projectId && !a.sent_at && !a.send_failed).length;
    },
    async getProjectById(id) { return byId(projects, id); },
    async createProject(ownerId, name) {
      const p = { id: crypto.randomUUID(), owner_id: ownerId, name, slack_webhook_enc: null, slack_enabled: false, slack_test_succeeded_at: null, slack_consecutive_failures: 0, deleted_at: null, created_at: new Date().toISOString() };
      projects.push(p);
      return p;
    },
    async getProjectWebhook(projectId) { return webhooks.get(projectId) ?? null; },
    async recordWebhookFailure(projectId) {
      const p = byId(projects, projectId);
      if (p) p.slack_consecutive_failures += 1;
      return p?.slack_consecutive_failures ?? 0;
    },
    async recordWebhookSuccess(projectId, testSucceeded) {
      const p = byId(projects, projectId);
      if (p) {
        p.slack_consecutive_failures = 0;
        if (testSucceeded) p.slack_test_succeeded_at = new Date().toISOString();
      }
    },
    async updateMetaCheck(now) { meta.last_check_at = now.toISOString(); },
    async getMeta() { return meta; },
    async listJobsForCheck() {
      return jobs.filter((j) => !j.deleted_at && j.schedule_kind !== "none").map((job) => {
        const jobRuns = runs.filter((r) => r.job_id === job.id)
          .sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
        return {
          job,
          lastRun: jobRuns[0] ?? null,
          runningRuns: jobRuns.filter((r) => r.status === "running"),
          openAlerts: alerts.filter((a) => a.job_id === job.id && !a.resolved_at),
        };
      });
    },
    async listJobsByProject(projectId) {
      return jobs.filter((j) => j.project_id === projectId && !j.deleted_at).map((job) => {
        const jobRuns = runs.filter((r) => r.job_id === job.id)
          .sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
        return {
          job,
          lastRun: jobRuns[0] ?? null,
          hasFinishedRun: jobRuns.some((r) => r.status !== "running"),
          openAlertKind: alerts.find((a) => a.job_id === job.id && !a.resolved_at)?.kind ?? null,
          hasRunningRun: jobRuns.some((r) => r.status === "running"),
        };
      });
    },

    async getDemoStrip() {
      const project = projects.find((p) => p.name === "demo" && !p.deleted_at) ?? null;
      if (!project) return null;
      const job = jobs.find((j) => j.project_id === project.id && j.name === "nightly-backup" && !j.deleted_at) ?? null;
      if (!job) return null;
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const jobRuns = runs.filter((r) => r.job_id === job.id && r.started_at >= since);
      const missed = alerts.filter((a) => a.job_id === job.id && a.kind === "missed" && a.created_at >= since);
      const failed = jobRuns.filter((r) => r.status === "failed")
        .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))[0] ?? null;
      const alert = alerts.filter((a) => a.job_id === job.id && a.kind === "failure")
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] ?? null;
      return {
        jobName: job.name,
        strip: tickStrip(jobRuns, missed, 30, new Date()),
        failure: failed,
        alert,
      };
    },
  };
}

// Seed one project + key for ingest tests. Returns { project, key, raw }.
export async function seedProjectKey(store, ownerId = "owner-1") {
  const { hashKey, newRawKey } = await import("../lib/keys.js");
  const project = await store.createProject(ownerId, "test");
  const raw = newRawKey();
  const key = {
    id: crypto.randomUUID(), project_id: project.id, key_hash: hashKey(raw),
    name: "test key", last_used_at: null, revoked_at: null, deleted_at: null,
    created_at: new Date().toISOString(),
  };
  store._keys.push(key);
  return { project, key: { ...key, project }, raw };
}
