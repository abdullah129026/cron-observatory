// POST /api/projects/[id]/webhook/test — send a [TEST] message.
// A failure names the fix inline: "Slack rejected the webhook
// (HTTP {code}). Check the URL."
import { createStore } from "@/lib/store.js";
import { requireSession, requireOwnProject } from "@/lib/auth.js";
import { ok, err, routeError } from "@/lib/http.js";
import { isConfigured } from "@/lib/db.js";
import { sendSlack, testMessage } from "@/lib/slack.js";
import { event } from "@/lib/log.js";

export async function POST(req, { params }) {
  try {
    if (!isConfigured()) return err("unconfigured", "Service is not configured yet.", 503);
    const user = await requireSession();
    const store = createStore();
    const { id } = await params;
    const project = await requireOwnProject(store, user.id, id);
    const webhook = await store.getProjectWebhook(project.id);
    if (!webhook) return err("bad_request", "No webhook saved yet.", 400);
    const res = await sendSlack(webhook, testMessage(project.name));
    if (!res.ok) {
      await store.recordWebhookFailure(project.id);
      event("slack_test_failed", { project_id: project.id, status: res.status });
      return err("slack_rejected", `Slack rejected the webhook (HTTP ${res.status}). Check the URL.`, 502);
    }
    await store.recordWebhookSuccess(project.id, true);
    event("slack_test_sent", { project_id: project.id });
    return ok({ sent: true });
  } catch (e) {
    return routeError(e);
  }
}
