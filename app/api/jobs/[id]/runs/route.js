// GET /api/jobs/[id]/runs — run history, 25 per page, with synthetic
// missed rows merged in (from missed alerts, visually distinct).
import { createStore } from "@/lib/store.js";
import { requireSession, requireOwnJob } from "@/lib/auth.js";
import { ok, err, routeError } from "@/lib/http.js";
import { isConfigured } from "@/lib/db.js";
import { getJobRuns } from "@/lib/jobdetail.js";

export async function GET(req, { params }) {
  try {
    if (!isConfigured()) return err("unconfigured", "Service is not configured yet.", 503);
    const user = await requireSession();
    const store = createStore();
    const { id } = await params;
    const { job } = await requireOwnJob(store, user.id, id);
    const url = new URL(req.url);
    const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0) || 0);
    const data = await getJobRuns(store, job.id, offset);
    return ok(data);
  } catch (e) {
    return routeError(e);
  }
}
