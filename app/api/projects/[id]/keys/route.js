// /api/projects/[id]/keys — list key metadata (never values) and
// create a key. The raw key is returned once, in this response only.
import { createStore } from "@/lib/store.js";
import { requireSession, requireOwnProject } from "@/lib/auth.js";
import { readJson, ok, err, routeError } from "@/lib/http.js";
import { reqString } from "@/lib/validate.js";
import { newRawKey, hashKey } from "@/lib/keys.js";
import { isConfigured } from "@/lib/db.js";
import { event } from "@/lib/log.js";

export async function GET(req, { params }) {
  try {
    if (!isConfigured()) return err("unconfigured", "Service is not configured yet.", 503);
    const user = await requireSession();
    const store = createStore();
    const { id } = await params;
    const project = await requireOwnProject(store, user.id, id);
    const keys = await store.listKeysByProject(project.id);
    return ok({ keys });
  } catch (e) {
    return routeError(e);
  }
}

export async function POST(req, { params }) {
  try {
    if (!isConfigured()) return err("unconfigured", "Service is not configured yet.", 503);
    const user = await requireSession();
    const body = await readJson(req);
    const name = reqString(body, "name");
    const store = createStore();
    const { id } = await params;
    const project = await requireOwnProject(store, user.id, id);
    const raw = newRawKey();
    const key = await store.createKey(project.id, name, hashKey(raw));
    event("api_key_created", { project_id: project.id });
    // The raw key is shown once, here. It is never stored.
    return ok({ key: { ...key, raw } }, 201);
  } catch (e) {
    return routeError(e);
  }
}
