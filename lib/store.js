// Data access over Supabase (service_role). One object of small
// functions; lib/ingest.js and lib/check.js take a store, so tests
// inject an in-memory fake with the same shape instead of a DB.
// Every function returns plain rows or null, and throws on DB error.
import { serviceClient } from "./db.js";

function mustRows(res, what) {
  if (res.error) throw new Error(`db ${what}: ${res.error.message}`);
  return res.data;
}

export function createStore() {
  const db = serviceClient();
  if (!db) throw new Error("db unconfigured");
  const nowIso = () => new Date().toISOString();

  return {
    // --- API keys (ingest auth) ---
    async getKeyByHash(hash) {
      const res = await db.from("api_keys")
        .select("*, projects!inner(id, owner_id, deleted_at)")
        .eq("key_hash", hash)
        .is("revoked_at", null)
        .is("deleted_at", null)
        .single();
      if (res.error) return null; // no row: bad key, not a DB error
      const row = res.data;
      if (row.projects?.deleted_at) return null;
      return { ...row, project: row.projects };
    },
    async touchKeyLastUsed(key) {
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      await db.from("api_keys").update({ last_used_at: nowIso() })
        .eq("id", key.id)
        .or(`last_used_at.is.null,last_used_at.lt.${oneHourAgo}`);
    },
    async countLiveJobsForOwner(ownerId) {
      const projects = mustRows(
        await db.from("projects").select("id").eq("owner_id", ownerId).is("deleted_at", null),
        "list projects");
      if (projects.length === 0) return 0;
      const res = await db.from("jobs")
        .select("id", { count: "exact", head: true })
        .in("project_id", projects.map((p) => p.id))
        .is("deleted_at", null);
      if (res.error) throw new Error(`db count jobs: ${res.error.message}`);
      return res.count ?? 0;
    },

    // --- jobs ---
    async getJobByName(projectId, name) {
      const res = await db.from("jobs").select("*")
        .eq("project_id", projectId).eq("name", name).is("deleted_at", null)
        .maybeSingle();
      if (res.error) throw new Error(`db get job: ${res.error.message}`);
      return res.data;
    },
    async getDeletedJobByName(projectId, name) {
      const res = await db.from("jobs").select("*")
        .eq("project_id", projectId).eq("name", name).not("deleted_at", "is", null)
        .maybeSingle();
      if (res.error) throw new Error(`db get deleted job: ${res.error.message}`);
      return res.data;
    },
    async getJobById(id) {
      const res = await db.from("jobs").select("*").eq("id", id).maybeSingle();
      if (res.error) throw new Error(`db get job: ${res.error.message}`);
      return res.data;
    },
    async createJob(projectId, fields) {
      return mustRows(
        await db.from("jobs").insert({ project_id: projectId, ...fields }).select().single(),
        "create job");
    },
    async updateJob(id, fields) {
      return mustRows(
        await db.from("jobs").update(fields).eq("id", id).select().single(),
        "update job");
    },
    async listJobsByProject(projectId) {
      const jobs = mustRows(
        await db.from("jobs").select("*").eq("project_id", projectId)
          .is("deleted_at", null).order("name"),
        "list jobs");
      if (jobs.length === 0) return [];
      const ids = jobs.map((j) => j.id);
      const runs = mustRows(
        await db.from("runs").select("job_id, started_at, finished_at, status")
          .in("job_id", ids).order("started_at", { ascending: false }).limit(1000),
        "list recent runs");
      const alerts = mustRows(
        await db.from("alerts").select("job_id, kind")
          .in("job_id", ids).is("resolved_at", null),
        "list open alerts");
      const running = mustRows(
        await db.from("runs").select("job_id").in("job_id", ids).eq("status", "running"),
        "list running runs");
      return jobs.map((j) => ({
        job: j,
        lastRun: runs.find((r) => r.job_id === j.id) ?? null,
        hasFinishedRun: runs.some((r) => r.job_id === j.id && r.status !== "running"),
        openAlertKind: alerts.find((a) => a.job_id === j.id)?.kind ?? null,
        hasRunningRun: running.some((r) => r.job_id === j.id),
      }));
    },

    // --- runs ---
    async createRun(fields) {
      const res = await db.from("runs").insert(fields).select().single();
      if (res.error) {
        // run_uuid is unique: a retry of the same ping returns the
        // existing row instead of a duplicate (idempotency).
        if (res.error.code === "23505") {
          const existing = await db.from("runs").select("*")
            .eq("run_uuid", fields.run_uuid).single();
          if (!existing.error) return { run: existing.data, created: false };
        }
        throw new Error(`db create run: ${res.error.message}`);
      }
      return { run: res.data, created: true };
    },
    async getRunByUuid(runUuid) {
      const res = await db.from("runs").select("*").eq("run_uuid", runUuid).maybeSingle();
      if (res.error) throw new Error(`db get run: ${res.error.message}`);
      return res.data;
    },
    async finishRun(id, fields) {
      return mustRows(
        await db.from("runs").update(fields).eq("id", id).select().single(),
        "finish run");
    },
    async listRunsForJob(jobId, limit, offset) {
      const res = await db.from("runs").select("*", { count: "exact" })
        .eq("job_id", jobId).order("started_at", { ascending: false })
        .range(offset, offset + limit - 1);
      if (res.error) throw new Error(`db list runs: ${res.error.message}`);
      return { rows: res.data, total: res.count ?? 0 };
    },
    async listRunsInWindow(jobId, sinceIso) {
      return mustRows(
        await db.from("runs").select("status, started_at, finished_at, duration_ms")
          .eq("job_id", jobId).gte("started_at", sinceIso)
          .order("started_at", { ascending: false }).limit(1000),
        "list runs in window");
    },

    // --- alerts ---
    async claimAlert(fields) {
      const res = await db.rpc("claim_alert", {
        p_project_id: fields.project_id,
        p_job_id: fields.job_id,
        p_run_id: fields.run_id ?? null,
        p_kind: fields.kind,
        p_message: fields.message ?? "",
      });
      if (res.error) throw new Error(`db claim alert: ${res.error.message}`);
      return res.data?.[0] ?? null;
    },
    async claimAlertSend(id) {
      const res = await db.rpc("claim_alert_send", { p_alert_id: id });
      if (res.error) throw new Error(`db claim send: ${res.error.message}`);
      return res.data?.[0] ?? null;
    },
    async markAlertSent(id, now) {
      await db.from("alerts").update({ sent_at: now.toISOString() }).eq("id", id);
    },
    async markAlertSendFailed(id, giveUp) {
      await db.from("alerts").update({ send_failed: giveUp, sending_started_at: null }).eq("id", id);
    },
    async resolveOpenAlerts(jobId) {
      const res = await db.rpc("resolve_open_alerts", { p_job_id: jobId });
      if (res.error) throw new Error(`db resolve alerts: ${res.error.message}`);
      return res.data ?? [];
    },
    async resolveAlertKind(jobId, kind) {
      const res = await db.rpc("resolve_alert_kind", { p_job_id: jobId, p_kind: kind });
      if (res.error) throw new Error(`db resolve alert kind: ${res.error.message}`);
      return res.data ?? [];
    },
    async listUnsentAlerts() {
      return mustRows(
        await db.from("alerts")
          .select("*, jobs!inner(id, name, project_id), projects!inner(id, name, owner_id)")
          .is("sent_at", null).eq("send_failed", false)
          .order("created_at", { ascending: true }).limit(100),
        "list unsent alerts");
    },
    async listAlertsForJob(jobId, limit) {
      return mustRows(
        await db.from("alerts").select("*").eq("job_id", jobId)
          .order("created_at", { ascending: false }).limit(limit),
        "list alerts");
    },
    async countUnsentAlerts(projectId) {
      const res = await db.from("alerts")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId).is("sent_at", null).eq("send_failed", false);
      if (res.error) throw new Error(`db count unsent: ${res.error.message}`);
      return res.count ?? 0;
    },

    // --- projects, keys, webhooks (dashboard) ---
    async listProjectsByOwner(ownerId) {
      return mustRows(
        await db.from("projects").select("*").eq("owner_id", ownerId)
          .is("deleted_at", null).order("created_at"),
        "list projects");
    },
    async getProjectById(id) {
      const res = await db.from("projects").select("*").eq("id", id).maybeSingle();
      if (res.error) throw new Error(`db get project: ${res.error.message}`);
      return res.data;
    },
    async createProject(ownerId, name) {
      return mustRows(
        await db.from("projects").insert({ owner_id: ownerId, name }).select().single(),
        "create project");
    },
    async softDeleteProject(id) {
      const now = nowIso();
      await db.from("projects").update({ deleted_at: now }).eq("id", id);
      await db.from("jobs").update({ deleted_at: now }).eq("project_id", id).is("deleted_at", null);
      await db.from("api_keys").update({ revoked_at: now, deleted_at: now })
        .eq("project_id", id).is("deleted_at", null);
      await db.from("projects").update({ slack_webhook_enc: null, slack_enabled: false })
        .eq("id", id);
    },
    async listKeysByProject(projectId) {
      return mustRows(
        await db.from("api_keys").select("id, name, last_used_at, revoked_at, created_at")
          .eq("project_id", projectId).is("deleted_at", null)
          .order("created_at", { ascending: false }),
        "list keys");
    },
    async createKey(projectId, name, hash) {
      return mustRows(
        await db.from("api_keys").insert({ project_id: projectId, name, key_hash: hash })
          .select("id, name, created_at").single(),
        "create key");
    },
    async revokeKey(id) {
      await db.from("api_keys").update({ revoked_at: nowIso() }).eq("id", id);
    },
    async getProjectWebhook(projectId) {
      const res = await db.rpc("get_project_webhook", { p_project_id: projectId });
      if (res.error) throw new Error(`db get webhook: ${res.error.message}`);
      return res.data ?? null;
    },
    async setProjectWebhook(projectId, url) {
      const res = await db.rpc("set_project_webhook", { p_project_id: projectId, p_url: url });
      if (res.error) throw new Error(`db set webhook: ${res.error.message}`);
    },
    async clearWebhook(projectId) {
      await db.from("projects")
        .update({ slack_webhook_enc: null, slack_enabled: false, slack_test_succeeded_at: null })
        .eq("id", projectId);
      // Queued unsent alerts are dropped with the webhook (docs 9).
      await db.from("alerts").update({ send_failed: true })
        .eq("project_id", projectId).is("sent_at", null);
    },
    async recordWebhookFailure(projectId) {
      const p = await db.from("projects").select("slack_consecutive_failures")
        .eq("id", projectId).single();
      const n = (p.data?.slack_consecutive_failures ?? 0) + 1;
      await db.from("projects").update({ slack_consecutive_failures: n }).eq("id", projectId);
      return n;
    },
    async recordWebhookSuccess(projectId, testSucceeded) {
      const fields = { slack_consecutive_failures: 0 };
      if (testSucceeded) fields.slack_test_succeeded_at = nowIso();
      await db.from("projects").update(fields).eq("id", projectId);
    },

    // --- monitor heartbeat ---
    async getMeta() {
      const res = await db.from("meta").select("*").eq("id", 1).single();
      if (res.error) throw new Error(`db meta: ${res.error.message}`);
      return res.data;
    },
    async updateMetaCheck(now) {
      await db.from("meta").update({ last_check_at: now.toISOString() }).eq("id", 1);
    },
    async listJobsForCheck() {
      const jobs = mustRows(
        await db.from("jobs").select("*").is("deleted_at", null)
          .neq("schedule_kind", "none"),
        "list jobs for check");
      if (jobs.length === 0) return [];
      const ids = jobs.map((j) => j.id);
      const runs = mustRows(
        await db.from("runs").select("job_id, started_at, finished_at, status")
          .in("job_id", ids).order("started_at", { ascending: false }).limit(1000),
        "list runs for check");
      const alerts = mustRows(
        await db.from("alerts").select("job_id, kind, created_at")
          .in("job_id", ids).is("resolved_at", null),
        "list open alerts for check");
      return jobs.map((j) => ({
        job: j,
        lastRun: runs.find((r) => r.job_id === j.id) ?? null,
        runningRuns: runs.filter((r) => r.job_id === j.id && r.status === "running"),
        openAlerts: alerts.filter((a) => a.job_id === j.id),
      }));
    },

    // --- export / account ---
    async exportForOwner(ownerId) {
      const projects = await this.listProjectsByOwner(ownerId);
      const out = { exported_at: nowIso(), projects: [] };
      for (const p of projects) {
        const jobs = mustRows(
          await db.from("jobs").select("*").eq("project_id", p.id).is("deleted_at", null),
          "export jobs");
        const keys = await this.listKeysByProject(p.id);
        const jobIds = jobs.map((j) => j.id);
        const runs = jobIds.length ? mustRows(
          await db.from("runs").select("*").in("job_id", jobIds)
            .order("started_at", { ascending: false }).limit(1000),
          "export runs") : [];
        const alerts = jobIds.length ? mustRows(
          await db.from("alerts").select("*").in("job_id", jobIds)
            .order("created_at", { ascending: false }).limit(1000),
          "export alerts") : [];
        out.projects.push({
          ...p, slack_webhook_enc: undefined, slack_webhook_present: Boolean(p.slack_webhook_enc),
          jobs, api_keys: keys, runs, alerts,
        });
      }
      return out;
    },
    async deleteAccountData(ownerId) {
      const projects = await this.listProjectsByOwner(ownerId);
      for (const p of projects) await this.softDeleteProject(p.id);
    },
  };
}
