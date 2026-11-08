# Backend QA checklist (phase-3)

Run against a local dev server (`npm run dev`) first, then against
the deployed app in phase-6. Items marked [live-db] need a real
Supabase project with the migrations applied.

## Without a DB (unconfigured)

- [ ] `GET /api/health` returns 503 with `db: "unconfigured"`.
- [ ] `POST /v1/runs/start` with no env returns 503, not 500.
- [ ] `POST /v1/runs/start` with a 40KB body returns 400 `body_too_large`.
- [ ] `POST /v1/runs/start` with malformed JSON returns 400 `bad_json`.

## With Supabase env vars set (dummy values are fine for auth checks)

- [ ] `POST /api/cron/check` with no bearer returns 401.
- [ ] `POST /api/cron/check` with a wrong bearer returns 401.
- [ ] `GET /api/projects` with no session returns 401.
- [ ] `GET /api/jobs/<random-uuid>` with no session returns 401.

## [live-db] Ingest round-trip

- [ ] Create a project + key in the dashboard, copy the raw key.
- [ ] `POST /v1/runs/start` with the key and `{job, run_uuid}` returns
      200 and creates a New job row.
- [ ] Repeat the same start (same `run_uuid`) returns the same run, no
      duplicate row.
- [ ] `POST /v1/runs/finish` with `{run_uuid, ok: true}` returns 200
      and the job flips to Up.
- [ ] `POST /v1/runs/finish` with an unknown `run_uuid` returns 404.
- [ ] `POST /v1/runs/finish` with `{ok: false}` opens one failure
      alert; a second failure while it is open does not open another.
- [ ] 61 start pings in one minute: the 61st returns 429.
- [ ] An 11th job's first ping returns 429 `job_limit_reached`.
- [ ] A start ping for a deleted job name returns 200 `dropped`.

## [live-db] Detection tick

- [ ] A job with schedule `0 3 * * *` and no run in its window flips
      to Late inside grace, then Down past grace, with exactly one
      missed alert and one Slack message.
- [ ] A start ping while a missed alert is open resolves it; the next
      successful finish sends one recovery message.
- [ ] A run with no finish past `max_runtime_seconds` is marked
      timed_out with one timeout alert; a late finish after that keeps
      the timed_out status.
- [ ] `GET /api/health` returns 200 with `db: "connected"` and a fresh
      `last_check_at` after a tick.

## [live-db] Dashboard API

- [ ] `GET /api/projects/<other-account-project-id>` returns 404 (no leak).
- [ ] `POST /api/projects/<id>/keys` returns the raw key once; a second
      GET never shows a value.
- [ ] `DELETE /api/projects/<id>/keys/<keyId>` revokes; pings with that
      key return 401 after.
- [ ] `POST /api/projects/<id>/webhook` with an http URL returns 400;
      with an https URL returns 200.
- [ ] `POST /api/projects/<id>/webhook/test` with a bad webhook returns
      502 naming the HTTP code; with a good one returns 200.
- [ ] `GET /api/projects/<id>/export` downloads JSON with key metadata
      and webhook presence, never raw keys or the webhook URL.
- [ ] `PATCH /api/jobs/<id>` with a bad cron expression returns 400
      naming the fix; with a bad timezone returns 400.
- [ ] `DELETE /api/jobs/<id>` soft-deletes; the name stays reserved.

## SDK smoke (against the local dev server)

- [ ] `CRON_API_KEY=<key> CRON_BASE_URL=http://localhost:3000 node -e
      "import('./sdk/index.js').then(async m => { await m.wrap('smoke', async () => { console.log('did work'); }); })"`
      creates a run and finishes it green.
- [ ] A wrapped function that throws still throws to the caller, and
      the failure ping lands with the error text.
- [ ] With the server down, `wrap` logs a diagnostic and the job's
      return value is unchanged.

## Frontend QA checklist (phase-5)

Run against the production server (`npm run build && npm run start`).
Public screens screenshot at 375/768/1440 with headless Chromium
(`work/pw/shots3.js`, shots in `work/shots/`). No horizontal overflow
on any public page at any width; no console errors except the expected
404 resource message on the not-found page.

Viewed 2026-11-08: landing 375/768/1440, docs 375/1440, terms 1440,
login invalid-email and send-failure states, focus ring on the landing
brand link, not-found at 375. Privacy uses the same legal layout as
terms; login/docs/not-found at the other widths are covered by the
overflow check, not a viewed screenshot.

- [x] `GET /` renders in 3.2s against a hung database with the caption
      "Demo strip unavailable" (was: hung indefinitely; fixed with a
      3s race in `app/page.js` and a 10s fetch cap in `lib/db.js`).
- [x] Signed-out `/dashboard`, `/settings`, `/onboarding`, `/jobs/[id]`
      return 307 to `/login` with and without Supabase env vars (was:
      200 plus a meta refresh and a flash of app chrome when env was
      unset; fixed in `proxy.js`).
- [x] `--new` is `#9CA3AF` (7.7:1 on `--bg`), not `#6B7280` (4.0:1,
      failed WCAG AA for the New badge text).
- [x] Table rows are 56px on touch (`@media (pointer: coarse)`),
      48px on desktop.
- [x] Login with an invalid email shows "Enter a valid email address."
      inline with a red field border; a send failure shows the banner
      "Could not send the link. Try again." with the form intact.
- [x] Tab focus shows the `--focus` ring (verified on the landing
      brand link). Modal traps focus, closes on Escape and backdrop
      click, returns focus (read in `components/Modal.js`).
- [x] Contrast, computed: ink 16.6:1, ink-2 8.9:1, ink-3 6.3:1,
      up 10.1:1, late 11.7:1, down 7.0:1, focus 11.7:1 on `--bg`.
- [x] Motion tokens only: 150/220/300ms, transform and opacity only,
      reduced motion respected (`components.css`).
- [x] States matrix, static check: every loading/empty/error cell in
      DESIGN-COPY section 10 has a matching branch in the page code
      (skeleton `loading.js` files, waiting-for-first-ping frame,
      "No runs yet", "No alerts yet", chart "needs at least 2 finished
      runs", "Job not found" frame, webhook test error copy).

Still open (needs a live Supabase project, phase-6): every signed-in
screen and state (dashboard table with real jobs, job detail, settings
cards, onboarding flow, callback, banners, delete modals), the real
demo strip, and the signed-in screenshot pass.

## Automated tests

- [ ] `npm test` green (includes the seven preventive tests:
      grace_boundary, flaky_ping_retry_idempotent, dst_transition,
      stuck_run_timeout, alert_dedupe, alert_rearm,
      sdk_never_crashes_job).
- [ ] `npm run build` clean.

