// POST /api/events — client analytics events (DESIGN-COPY 11).
// Only the allowlisted names are accepted; the log is the sink in
// v1 (lib/log.js event), so a real sink later is one function change.
import { ok, err, routeError, readJson, InputError } from "@/lib/http.js";
import { event } from "@/lib/log.js";

const ALLOWED = new Set(["sdk_snippet_copied", "landing_viewed", "docs_viewed"]);

export async function POST(req) {
  try {
    const body = await readJson(req);
    const name = body.event;
    if (typeof name !== "string" || !ALLOWED.has(name)) {
      throw new InputError("bad_request", "Unknown analytics event.");
    }
    event(name);
    return ok({ recorded: true });
  } catch (e) {
    return routeError(e);
  }
}
