// /api/projects — list the session's projects, create one.
import { createStore } from "@/lib/store.js";
import { requireSession } from "@/lib/auth.js";
import { readJson, ok, err, routeError, InputError } from "@/lib/http.js";
import { reqString } from "@/lib/validate.js";
import { isConfigured } from "@/lib/db.js";
import { event } from "@/lib/log.js";

export async function GET() {
  try {
    if (!isConfigured()) return err("unconfigured", "Service is not configured yet.", 503);
    const user = await requireSession();
    const store = createStore();
    const projects = await store.listProjectsByOwner(user.id);
    return ok({ projects });
  } catch (e) {
    return routeError(e);
  }
}

export async function POST(req) {
  try {
    if (!isConfigured()) return err("unconfigured", "Service is not configured yet.", 503);
    const user = await requireSession();
    const body = await readJson(req);
    const name = reqString(body, "name");
    const store = createStore();
    const project = await store.createProject(user.id, name);
    event("project_created", { project_id: project.id });
    return ok({ project }, 201);
  } catch (e) {
    return routeError(e);
  }
}
