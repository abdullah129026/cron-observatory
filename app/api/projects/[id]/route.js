// /api/projects/[id] — detail (job count, webhook health, monitor
// heartbeat) and soft delete.
import { createStore } from "@/lib/store.js";
import { requireSession, requireOwnProject } from "@/lib/auth.js";
import { ok, err, routeError } from "@/lib/http.js";
import { isConfigured } from "@/lib/db.js";

export async function GET(req, { params }) {
  try {
    if (!isConfigured()) return err("unconfigured", "Service is not configured yet.", 503);
    const user = await requireSession();
    const store = createStore();
    const { id } = await params;
    const project = await requireOwnProject(store, user.id, id);
    const jobs = await store.listJobsByProject(project.id);
    const meta = await store.getMeta();
    const unsent = await store.countUnsentAlerts(project.id);
    // The URL is encrypted at rest; only its last four characters
    // ever leave the server (docs 6).
    let last4 = null;
    if (project.slack_webhook_enc) {
      const url = await store.getProjectWebhook(project.id);
      if (url) last4 = url.slice(-4);
    }
    return ok({
      project: {
        ...project,
        slack_webhook_enc: undefined,
        slack_webhook_present: Boolean(project.slack_webhook_enc),
        last4,
      },
      job_count: jobs.length,
      unsent_alerts: unsent,
      monitor: { last_check_at: meta?.last_check_at ?? null, cadence_seconds: 60 },
    });
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
    const project = await requireOwnProject(store, user.id, id);
    await store.softDeleteProject(project.id);
    return ok({ deleted: true });
  } catch (e) {
    return routeError(e);
  }
}
