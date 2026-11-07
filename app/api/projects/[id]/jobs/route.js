// /api/projects/[id]/jobs — the dashboard job table: one row per
// job with derived status, last run, next expected run, 7-day avg
// duration, consecutive failures, and the 30-day tick strip.
import { createStore } from "@/lib/store.js";
import { requireSession, requireOwnProject } from "@/lib/auth.js";
import { ok, err, routeError } from "@/lib/http.js";
import { isConfigured } from "@/lib/db.js";
import { listJobRows } from "@/lib/dashboard.js";

export async function GET(req, { params }) {
  try {
    if (!isConfigured()) return err("unconfigured", "Service is not configured yet.", 503);
    const user = await requireSession();
    const store = createStore();
    const { id } = await params;
    const project = await requireOwnProject(store, user.id, id);
    const jobs = await listJobRows(store, project.id, new Date());
    return ok({ jobs });
  } catch (e) {
    return routeError(e);
  }
}
