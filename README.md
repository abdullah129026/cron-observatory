# Cron Job Observatory

Know the minute a cron job fails, not when customers tell you.

A tiny Node SDK wraps your cron job and pings this service on start,
success, and failure. The dashboard shows every job's status, last
run, next expected run, and average duration. Missed runs and stuck
runs are detected by a check tick, and Slack gets exactly one message
per incident until the job recovers.

Free in v1, no card. MIT-licensed SDK.

## Quickstart (under 5 minutes)

1. Clone, install, run locally:
   ```sh
   npm install
   cp .env.example .env   # fill in your Supabase project
   npm run dev
   ```
2. Create a Supabase project, run `supabase/migrations/0001_schema.sql`,
   `0002_rpc.sql`, and `0003_rpc_alerts.sql` in the SQL editor, in order.
   Create a Vault secret named `webhook_enc_key` (any long random
   string) for Slack webhook encryption.
3. Sign in with a magic link, create a project, copy the API key.
4. Wrap a job:
   ```js
   import { wrap } from "./sdk/index.js";
   await wrap("nightly-backup", { schedule: "0 3 * * *", timezone: "Asia/Karachi" }, runBackup);
   ```
   With `CRON_API_KEY` and `CRON_BASE_URL` set in the job's environment.
5. Watch the dashboard fill in. Save a Slack webhook in Settings and
   send a test message to wire up alerts.

## Pages

- `/` landing, with a live demo strip from the seeded demo project.
- `/login` magic-link sign-in. `/onboarding` creates the first project,
  shows the API key once, and hands over the setup snippet.
- `/dashboard` jobs table, urgency-sorted (Down, Timed-out, Late, then
  name), with the 30-day tick strip per job.
- `/jobs/[id]` run history with synthetic missed rows, alert history,
  p50 duration chart, schedule settings, and the danger zone.
- `/docs` install, wrap, options, failure and logs, missed runs,
  limits, and SDK removal.
- `/settings` projects, API keys, Slack webhook, monitor status, data
  export, and account delete (typed DELETE, two steps).
- `/terms`, `/privacy` real content, written against the actual data
  inventory and retention windows; human-reviewed before launch.

## Deploy

Vercel for the app, Supabase for Postgres + Auth. The full click-by-click
guide is `DEPLOY.md`: Supabase project, migrations, Vault secrets,
Vercel env vars, site-URL audit, custom SMTP, pg_cron setup, demo seed,
uptime monitor, backups, and the verification sweep. Before the first
sign-in, set the Supabase site URL and redirect URLs to the live
domain, and configure custom SMTP (the built-in sender only reaches
team addresses).

## How it works

- Ingest: `POST /v1/runs/start` and `POST /v1/runs/finish`, authed by
  a per-project API key (SHA-256 hash stored, raw key shown once).
  Pings are idempotent by `run_uuid`; per-key rate limit 60/min.
- Detection: pg_cron wakes `POST /api/cron/check` every 60s. The tick
  compares each job's expected run (cron expression + IANA timezone,
  or interval) against actual pings: inside grace is Late, past grace
  is Down with one missed alert; a start with no finish past
  max_runtime is Timed-out. A start ping resolves an open missed
  alert; a successful finish resolves the rest and sends one
  recovery message.
- Alerts: claim-then-send, so a crashed isolate never double-sends
  and never loses an alert row. Unsent alerts are retried by the
  tick with backoff, and give up after 24 hours. Slack webhook URLs
  are encrypted with pgcrypto and a Vault key.
- Retention: success runs 30 days, failure runs 90 days, enforced by
  a daily pg_cron purge. Free-tier limits: 10 jobs per account.

## Repo layout

- `app/` — Next.js 16 App Router (plain JS). `app/v1/` is ingest,
  `app/api/` is the dashboard API plus the cron check and health.
- `lib/` — cron math (hand-rolled over Intl), state derivation,
  ingest, detection tick, Slack sender, validation, key hashing.
- `sdk/` — the zero-dependency Node wrapper (`wrap`).
- `supabase/migrations/` — schema, webhook RPCs, alert-claim RPCs.
- `supabase/pg_cron_setup.sql` — deploy-time pg_cron jobs (check
  tick + retention purge). Not a migration: run by hand with real values.
- `scripts/seed-demo.mjs` — seeds the demo project (30 days of runs).
- `test/` — `node:test`, zero dependencies. Run with `npm test`.

## Docs

- `PLAN.md` — product plan, state model, ADRs, risk register.
- `DEPLOY.md` — click-by-click deploy guide, backups, rollback plan.
- `CHANGELOG.md` — release notes.
- `DESIGN.md` / `DESIGN-COPY.md` — design direction and screen blueprints.
- `QA.md` — backend QA checklist (endpoint-by-endpoint).
- `SECURITY.md` — OWASP-basics checklist.
