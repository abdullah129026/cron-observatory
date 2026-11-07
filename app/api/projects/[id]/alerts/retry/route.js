// POST /api/projects/[id]/alerts/retry — immediate retry of the
// project's unsent alerts (the dashboard "Retry sends" banner).
// The check tick retries on its own every minute; this is the
// manual nudge. Claim-then-send, so a concurrent tick never
// double-sends.
import { createStore } from "@/lib/store.js";
import { requireSession, requireOwnProject } from "@/lib/auth.js";
import { ok, err, routeError } from "@/lib/http.js";
import { isConfigured } from "@/lib/db.js";
import { retryUnsentForProject } from "@/lib/alerts.js";

export async function POST(req, { params }) {
  try {
    if (!isConfigured()) return err("unconfigured", "Service is not configured yet.", 503);
    const user = await requireSession();
    const store = createStore();
    const { id } = await params;
    const project = await requireOwnProject(store, user.id, id);
    const result = await retryUnsentForProject(store, project.id, async (alert) => {
      const job = await store.getJobById(alert.job_id);
      if (!job) return null;
      return { jobName: job.name, projectName: project.name, jobId: job.id };
    });
    return ok(result);
  } catch (e) {
    return routeError(e);
  }
}
