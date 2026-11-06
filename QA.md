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

## Automated tests

- [ ] `npm test` green (includes the seven preventive tests:
      grace_boundary, flaky_ping_retry_idempotent, dst_transition,
      stuck_run_timeout, alert_dedupe, alert_rearm,
      sdk_never_crashes_job).
- [ ] `npm run build` clean.
