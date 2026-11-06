// /api/projects/[id]/webhook — Slack webhook: save (encrypted via
// the Vault RPC), remove. GET returns presence, health, and the
// unsent count; the URL itself never leaves the server.
import { createStore } from "@/lib/store.js";
import { requireSession, requireOwnProject } from "@/lib/auth.js";
import { readJson, ok, err, routeError } from "@/lib/http.js";
import { reqHttpsUrl } from "@/lib/validate.js";
import { isConfigured } from "@/lib/db.js";
import { event } from "@/lib/log.js";

export async function GET(req, { params }) {
  try {
    if (!isConfigured()) return err("unconfigured", "Service is not configured yet.", 503);
    const user = await requireSession();
    const store = createStore();
    const { id } = await params;
    const project = await requireOwnProject(store, user.id, id);
    const unsent = await store.countUnsentAlerts(project.id);
    return ok({
      configured: Boolean(project.slack_webhook_enc),
      enabled: project.slack_enabled,
      test_succeeded_at: project.slack_test_succeeded_at,
      healthy: project.slack_consecutive_failures < 3,
      consecutive_failures: project.slack_consecutive_failures,
      unsent_alerts: unsent,
    });
  } catch (e) {
    return routeError(e);
  }
}

export async function POST(req, { params }) {
  try {
    if (!isConfigured()) return err("unconfigured", "Service is not configured yet.", 503);
    const user = await requireSession();
    const body = await readJson(req);
    const url = reqHttpsUrl(body, "webhook_url");
    const store = createStore();
    const { id } = await params;
    const project = await requireOwnProject(store, user.id, id);
    await store.setProjectWebhook(project.id, url);
    event("slack_webhook_saved", { project_id: project.id });
    return ok({ saved: true });
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
    await store.clearWebhook(project.id);
    return ok({ removed: true });
  } catch (e) {
    return routeError(e);
  }
}
