// Ingest logic: start/finish pings. Pure over the store interface,
// so tests drive it with an in-memory fake. Routes handle HTTP,
// auth, and the post-response Slack fanout in after().
// Timestamps come from the server clock, never the client (ADR 3).
import { InputError } from "./errors.js";
import { reqJobName, reqString, reqUuid, optString, optInt, capExcerpt, defaultGrace } from "./validate.js";
import { parseCron, isValidTimezone } from "./cronmath.js";
import { hashKey } from "./keys.js";
import { log, event } from "./log.js";

export const JOB_LIMIT_PER_ACCOUNT = 10;

// Validate the x-api-key header against the store. Returns the key
// row with its project, or throws 401. Never logs the key.
export async function authenticateKey(store, rawKey) {
  if (!rawKey) throw new InputError("unauthorized", "Missing API key.", 401);
  const key = await store.getKeyByHash(hashKey(rawKey));
  if (!key) throw new InputError("unauthorized", "Invalid API key.", 401);
  return key;
}

function parseSchedule(body) {
  const schedule = body.schedule;
  const timezone = body.timezone;
  if (schedule === undefined && timezone === undefined) return null;
  if (typeof schedule === "string") {
    try {
      parseCron(schedule);
    } catch (e) {
      throw new InputError("bad_request", `Schedule does not parse as a cron expression. Example: 0 3 * * *. (${e.message})`);
    }
    if (timezone !== undefined && !isValidTimezone(timezone)) {
      throw new InputError("bad_request", "Unknown IANA timezone.");
    }
    return { schedule_kind: "cron", cron_expr: schedule, timezone: timezone ?? "UTC", period_seconds: null };
  }
  if (typeof schedule === "number") {
    if (!Number.isInteger(schedule) || schedule < 60 || schedule > 31536000) {
      throw new InputError("bad_request", "schedule as seconds must be a whole number between 60 and 31536000.");
    }
    return { schedule_kind: "interval", cron_expr: null, timezone: "UTC", period_seconds: schedule };
  }
  if (schedule === undefined && timezone !== undefined) {
    throw new InputError("bad_request", "timezone needs a schedule to go with.");
  }
  throw new InputError("bad_request", "schedule must be a cron expression string or an interval in seconds.");
}

// POST /v1/runs/start. Auto-registers the job on first ping.
export async function startRun(store, key, body, now = new Date()) {
  const jobName = reqJobName(body, "job");
  const runUuid = body.run_uuid === undefined ? null : reqUuid(body, "run_uuid");
  const sched = parseSchedule(body);

  // A retry of the same ping returns the existing run: one run per
  // run_uuid, even when the network retries (flaky_ping_retry test).
  if (runUuid) {
    const existing = await store.getRunByUuid(runUuid);
    if (existing) return { run: existing, job: null, created: false, dropped: false };
  }

  const deleted = await store.getDeletedJobByName(key.project_id, jobName);
  if (deleted) {
    // Deleted names stay quarantined until the retention purge
    // (docs 9). The ping is dropped, the job runs unmonitored.
    log("info", "ingest dropped ping for deleted job", { project_id: key.project_id, job: jobName });
    return { run: null, job: null, created: false, dropped: true };
  }

  let job = await store.getJobByName(key.project_id, jobName);
  if (!job) {
    const count = await store.countLiveJobsForOwner(key.project.owner_id);
    if (count >= JOB_LIMIT_PER_ACCOUNT) {
      throw new InputError("job_limit_reached", "This account already has 10 jobs. Delete one to monitor another.", 429);
    }
    const grace = sched
      ? defaultGrace(sched.schedule_kind === "cron" ? 3600 : sched.period_seconds)
      : 300;
    job = await store.createJob(key.project_id, {
      name: jobName,
      schedule_kind: sched?.schedule_kind ?? "none",
      cron_expr: sched?.cron_expr ?? null,
      timezone: sched?.timezone ?? "UTC",
      period_seconds: sched?.period_seconds ?? null,
      grace_seconds: grace,
      max_runtime_seconds: 3600,
    });
    event("first_ping_received", { project_id: key.project_id });
  } else if (sched && job.schedule_kind === "none") {
    // Schedule set on first registration only; after that the job
    // detail schedule settings are the escape hatch.
    job = await store.updateJob(job.id, {
      schedule_kind: sched.schedule_kind,
      cron_expr: sched.cron_expr,
      timezone: sched.timezone,
      period_seconds: sched.period_seconds,
      grace_seconds: defaultGrace(sched.schedule_kind === "cron" ? 3600 : sched.period_seconds),
    });
  }

  // A start ping resolves an open missed alert: the job is running
  // again. No Slack here; recovery goes out on the finish ping.
  const resolvedMissed = await store.resolveAlertKind(job.id, "missed");

  const { run, created } = await store.createRun({
    project_id: key.project_id,
    job_id: job.id,
    run_uuid: runUuid ?? crypto.randomUUID(),
    started_at: now.toISOString(),
    status: "running",
  });
  await store.touchKeyLastUsed(key);
  return { run, job, created, dropped: false, resolvedMissed: resolvedMissed.length > 0 };
}

// POST /v1/runs/finish. Body: { run_uuid, ok, error?, log_excerpt? }.
export async function finishRun(store, key, body, now = new Date()) {
  const runUuid = reqUuid(body, "run_uuid");
  const ok = body.ok;
  if (typeof ok !== "boolean") {
    throw new InputError("bad_request", "ok must be true or false.");
  }
  const errorText = optString(body, "error", 2000);
  const logExcerpt = capExcerpt(optString(body, "log_excerpt", 32000));

  const run = await store.getRunByUuid(runUuid);
  if (!run) throw new InputError("not_found", "No run with that run_uuid.", 404);
  if (run.project_id !== key.project_id) {
    throw new InputError("not_found", "No run with that run_uuid.", 404);
  }
  if (run.status !== "running") {
    // A late finish after a timeout keeps the timed_out status and
    // does not re-fire the alert (PLAN 0.1). Duration and log still
    // update, so the history stays honest.
    const updated = await store.finishRun(run.id, {
      duration_ms: now.getTime() - new Date(run.started_at).getTime(),
      exit_error: errorText,
      log_excerpt: logExcerpt,
    });
    return { run: updated, job: null, outcome: "late_finish", alert: null, resolved: [] };
  }

  const durationMs = now.getTime() - new Date(run.started_at).getTime();
  const updated = await store.finishRun(run.id, {
    status: ok ? "success" : "failed",
    finished_at: now.toISOString(),
    duration_ms: durationMs,
    exit_error: ok ? null : errorText,
    log_excerpt: logExcerpt,
  });
  await store.touchKeyLastUsed(key);

  const job = await store.getJobById(run.job_id);
  if (ok) {
    const resolved = await store.resolveOpenAlerts(job.id);
    if (await isFirstSuccess(store, job.id, run.id)) {
      event("job_first_green", { job_id: job.id });
    }
    return { run: updated, job, outcome: "success", alert: null, resolved };
  }
  // Failure: claim the alert row, then the route sends Slack in
  // after(). Only the claimer sends (claim-then-send).
  const alert = await store.claimAlert({
    project_id: key.project_id,
    job_id: job.id,
    run_id: run.id,
    kind: "failure",
    message: "",
  });
  if (alert) event("job_first_alert", { job_id: job.id });
  return { run: updated, job, outcome: "failed", alert, resolved: [] };
}

async function isFirstSuccess(store, jobId, runId) {
  const { rows } = await store.listRunsForJob(jobId, 2, 0);
  const successes = rows.filter((r) => r.status === "success");
  return successes.length === 1 && successes[0].id === runId;
}
