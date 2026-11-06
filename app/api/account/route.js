// DELETE /api/account — self-serve account delete (docs 9): soft
// delete every project (jobs, keys, webhooks follow), then delete
// the auth user. The typed DELETE confirmation lives in the UI;
// this route enforces it server-side too.
import { createStore } from "@/lib/store.js";
import { requireSession } from "@/lib/auth.js";
import { readJson, ok, err, routeError, InputError } from "@/lib/http.js";
import { isConfigured, serviceClient } from "@/lib/db.js";

export async function DELETE(req) {
  try {
    if (!isConfigured()) return err("unconfigured", "Service is not configured yet.", 503);
    const user = await requireSession();
    const body = await readJson(req);
    if (body.confirm !== "DELETE") {
      throw new InputError("bad_request", "Type DELETE to confirm account deletion.");
    }
    const store = createStore();
    await store.deleteAccountData(user.id);
    const db = serviceClient();
    const { error } = await db.auth.admin.deleteUser(user.id);
    if (error) throw new Error(`delete auth user: ${error.message}`);
    return ok({ deleted: true });
  } catch (e) {
    return routeError(e);
  }
}
