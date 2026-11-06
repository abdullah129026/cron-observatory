// GET /api/jobs/[id]/runs — run history, 25 per page, with synthetic
// missed rows merged in (from missed alerts, visually distinct).
import { createStore } from "@/lib/store.js";
import { requireSession, requireOwnJob } from "@/lib/auth.js";
import { ok, err, routeError } from "@/lib/http.js";
import { isConfigured } from "@/lib/db.js";
import { withSyntheticMissed } from "@/lib/state.js";

export async function GET(req, { params }) {
  try {
    if (!isConfigured()) return err("unconfigured", "Service is not configured yet.", 503);
    const user = await requireSession();
    const store = createStore();
    const { id } = await params;
    const { job } = await requireOwnJob(store, user.id, id);
    const url = new URL(req.url);
    const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0) || 0);
    const limit = 25;
    const { rows, total } = await store.listRunsForJob(job.id, limit, offset);
    const alerts = await store.listAlertsForJob(job.id, 100);
    const missed = alerts.filter((a) => a.kind === "missed");
    const merged = withSyntheticMissed(rows, missed);
    const alertHistory = alerts.slice(0, 25).map((a) => ({
      id: a.id,
      kind: a.kind,
      created_at: a.created_at,
      message: a.message,
      sent_at: a.sent_at,
      send_failed: a.send_failed,
      resolved_at: a.resolved_at,
    }));
    return ok({ runs: merged, total: total + missed.length, alerts: alertHistory });
  } catch (e) {
    return routeError(e);
  }
}
