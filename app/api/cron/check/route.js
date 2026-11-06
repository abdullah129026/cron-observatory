// POST /api/cron/check — the pg_cron tick, bearer-gated on
// CRON_SECRET. Wakes the sweep; all logic lives in lib/check.js.
// A missed pg_net call self-heals on the next tick.
import { createStore } from "@/lib/store.js";
import { runCheck } from "@/lib/check.js";
import { sendAlert } from "@/lib/alerts.js";
import { ok, err, routeError } from "@/lib/http.js";
import { isConfigured } from "@/lib/db.js";

export async function POST(req) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) return err("unconfigured", "CRON_SECRET is not set.", 503);
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return err("unauthorized", "Bad bearer token.", 401);
    }
    if (!isConfigured()) return err("unconfigured", "Service is not configured yet.", 503);
    const store = createStore();
    const summary = await runCheck(store, async (s, alert) => {
      // The alert text was stored at claim time; send it as-is.
      return sendAlert(s, alert, alert.message);
    });
    return ok(summary);
  } catch (e) {
    return routeError(e);
  }
}
