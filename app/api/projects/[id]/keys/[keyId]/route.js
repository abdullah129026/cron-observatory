// /api/projects/[id]/keys/[keyId] — revoke a key. Immediate, no undo.
import { createStore } from "@/lib/store.js";
import { requireSession, requireOwnProject } from "@/lib/auth.js";
import { ok, err, routeError, InputError } from "@/lib/http.js";
import { isConfigured } from "@/lib/db.js";

export async function DELETE(req, { params }) {
  try {
    if (!isConfigured()) return err("unconfigured", "Service is not configured yet.", 503);
    const user = await requireSession();
    const store = createStore();
    const { id, keyId } = await params;
    const project = await requireOwnProject(store, user.id, id);
    const keys = await store.listKeysByProject(project.id);
    if (!keys.some((k) => k.id === keyId)) {
      throw new InputError("not_found", "Key not found.", 404);
    }
    await store.revokeKey(keyId);
    return ok({ revoked: true });
  } catch (e) {
    return routeError(e);
  }
}
