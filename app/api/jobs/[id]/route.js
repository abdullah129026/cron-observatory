// /api/jobs/[id] — job detail: derived status, 30-day stat strip,
// run history (with synthetic missed rows), alert history, and the
// schedule settings (PATCH) plus soft delete.
import { createStore } from "@/lib/store.js";
import { requireSession, requireOwnJob } from "@/lib/auth.js";
import { readJson, ok, err, routeError } from "@/lib/http.js";
import { optInt, optString, reqString } from "@/lib/validate.js";
import { parseCron, isValidTimezone } from "@/lib/cronmath.js";
import { isConfigured } from "@/lib/db.js";
import { getJobDetail } from "@/lib/jobdetail.js";
import { InputError } from "@/lib/http.js";

function scheduleFields(body) {
  const kind = body.schedule_kind;
  if (kind === undefined) return null;
  if (kind === "none") {
    return { schedule_kind: "none", cron_expr: null, period_seconds: null };
  }
  if (kind === "cron") {
    const expr = reqString(body, "cron_expr", { max: 128 });
    try {
      parseCron(expr);
    } catch {
      throw new InputError("bad_request", "That cron expression does not parse. Example: 0 3 * * *.");
    }
    const timezone = reqString(body, "timezone", { max: 64 });
    if (!isValidTimezone(timezone)) {
      throw new InputError("bad_request", "Unknown IANA timezone.");
    }
    return { schedule_kind: "cron", cron_expr: expr, timezone, period_seconds: null };
  }
  if (kind === "interval") {
    const period = optInt(body, "period_seconds", { min: 60, max: 31536000, optional: false });
    return { schedule_kind: "interval", cron_expr: null, period_seconds: period };
  }
  throw new InputError("bad_request", "schedule_kind must be none, cron, or interval.");
}

export async function GET(req, { params }) {
  try {
    if (!isConfigured()) return err("unconfigured", "Service is not configured yet.", 503);
    const user = await requireSession();
    const store = createStore();
    const { id } = await params;
    const { job } = await requireOwnJob(store, user.id, id);
    const detail = await getJobDetail(store, job, new Date());
    return ok({ job, ...detail });
  } catch (e) {
    return routeError(e);
  }
}

export async function PATCH(req, { params }) {
  try {
    if (!isConfigured()) return err("unconfigured", "Service is not configured yet.", 503);
    const user = await requireSession();
    const body = await readJson(req);
    const store = createStore();
    const { id } = await params;
    const { job } = await requireOwnJob(store, user.id, id);
    const fields = {};
    const sched = scheduleFields(body);
    if (sched) Object.assign(fields, sched);
    const grace = optInt(body, "grace_seconds", { min: 0, max: 86400 });
    if (grace !== null) fields.grace_seconds = grace;
    const maxRuntime = optInt(body, "max_runtime_seconds", { min: 60, max: 86400 });
    if (maxRuntime !== null) fields.max_runtime_seconds = maxRuntime;
    // Timezone can change without a schedule change (cron jobs).
    if (body.timezone !== undefined && !sched) {
      const timezone = reqString(body, "timezone", { max: 64 });
      if (!isValidTimezone(timezone)) {
        throw new InputError("bad_request", "Unknown IANA timezone.");
      }
      fields.timezone = timezone;
    }
    if (Object.keys(fields).length === 0) {
      throw new InputError("bad_request", "Nothing to update.");
    }
    const updated = await store.updateJob(job.id, fields);
    return ok({ job: updated });
  } catch (e) {
    return routeError(e);
  }
}

export async function DELETE(req, { params }) {
  try {
    if (!isConfigured()) return err("unconfigured", "Service is not configured yet.", 503);
    const user = await requireSession();
    const store = createStore();
    const { id } = await params;
    const { job } = await requireOwnJob(store, user.id, id);
    // Soft delete: the name stays quarantined until the retention
    // purge clears the row (docs 9). Runs and alerts follow the
    // retention windows.
    await store.updateJob(job.id, { deleted_at: new Date().toISOString() });
    return ok({ deleted: true });
  } catch (e) {
    return routeError(e);
  }
}
