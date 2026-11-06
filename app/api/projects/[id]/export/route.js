// GET /api/projects/[id]/export — self-serve data export as one
// JSON file. Key metadata and webhook presence only, never raw keys
// or the webhook URL (docs 6).
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
    const data = await store.exportForOwner(user.id);
    const mine = data.projects.find((p) => p.id === project.id);
    return new Response(JSON.stringify(mine ?? null, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="cron-observatory-export-${project.id}.json"`,
      },
    });
  } catch (e) {
    return routeError(e);
  }
}
