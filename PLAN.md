# PLAN.md — Cron Job Observatory (project 4)

Phase-0 planning document. Status: draft for Abdullah's approval.
One phase per day, 2026-11-02 → 2026-11-09. No code exists yet.

## 0.0 Research sprints

Five role sprints ran 2026-11-02. Full notes with sources live in the
goal workspace at `hidden_files/research-0.0/`. The findings that shape
this plan:

**Architect + DevOps.** Vercel Hobby cron runs at most once per day
(fires anywhere inside the scheduled hour, UTC), so the detection loop
cannot live there: Supabase pg_cron runs every minute on the free plan,
and that is where missed-run detection goes. Vercel Hobby's binding
limit is 1M function invocations/mo (each ping is one invocation, ~23
pings/min sustained across all users). Supabase free's binding limit is the
500 MB database (read-only above it), so run-history retention is a hard
design requirement, not polish. Free Supabase pauses after 7 days of
inactivity; a dead-man's-switch check on our own health endpoint both
monitors the monitor and keeps the project awake. Auth defaults break
launch day unless custom SMTP and the site URL are fixed first (his
clicks).

**PM + UX Researcher.** Healthchecks.io shipped the whole MVP (ping
endpoint + missed-run detection) in ~1 month on a boring stack; Cronitor
took 8-10 weeks of nights and cut ping history, duration views, and
automated emails from v1; CronBuzz took 3 months and still needed
distribution. Cross-builder lesson: the ping endpoint plus missed-run
detection IS the MVP; reliability of the service itself is the
differentiator, not feature count. Real objection patterns: "who
monitors the monitor" (trust), "too simple to pay for" (pricing
skepticism), alert fatigue, and silent successes (exit 0 that did
nothing). Demand is unvalidated: no real user conversations happened in
this session. Best validation channels: Show HN, r/selfhosted,
r/devops, Indie Hackers, answering StackOverflow cron-monitoring
questions, docs-as-SEO.

**Designer.** Healthchecks teaches the four-state model on its homepage
(New / Up / Late / Down) and uses shape + color status icons with
relative times ("5 minutes ago"); its mistake to avoid is two-line
stacked cells that slow scanning. Cronitor's job detail leads with a
5-cell stat strip (every number carries its time window) and percentile
duration toggles; its mistake to avoid is three-hop alert configuration
(Settings > Integrations > named lists > attach). Better Stack's tick
strips compress 90 days of health into ~40px per row but optimize for
viewers, not operators. Empty-state pattern across all three: bypass the
empty state by making the first instrumented job exist within minutes
(pre-filled code snippet, celebrate the first green row), never an
illustration.

**Engineer + QA.** Ingest must validate the key, write the row, and
return immediately; Slack fanout and evaluation go in `after()`.
Ingest stays out of middleware auth (one documented case burned 230% of
the Hobby CPU quota refreshing sessions per request). supabase-js goes
through PostgREST over stateless HTTP, so no DB connection pooling
problem. service_role needs explicit table GRANTs (Supabase grants
nothing by default since 2026-10-30); the key must never reach the
browser. SDK `wrap` must return a function identical to `fn` and never
crash or stall the user's job: try/catch + timeout on every ping,
awaited pings, swallowed ping errors. Stuck runs are a server-side
problem (max_runtime per job; start with no finish becomes "timed out",
distinct from "missed"); never alert on a single missed ping (Late/Down
two-stage state, retries on the ping path). Timestamps come from the
server clock, never the client. DST rule: one documented rule, the
repeated hour is one expected window. Seven preventive test cases
ship with phase-3 (grace_boundary, flaky_ping_retry_idempotent,
dst_transition, stuck_run_timeout, alert_dedupe, alert_rearm,
sdk_never_crashes_job).

**Marketing + Legal.** Healthchecks free = 20 jobs (we do not fight it
on "free heartbeat"; we win on wrapper DX: one-line Node wrapper that
captures what the job did). Cronitor free = 5 monitors; Better Stack
free = 10 monitors + 10 heartbeats. Positioning wedge: "run my job too"
(none of the three schedules the job; they only listen for pings) plus
failed logs and duration in one line of code. Legal minimum: Terms +
Privacy (generated with Termly or equivalent, human-reviewed on the
data-inventory and retention sections), cookie notice only if analytics
are used, MIT license for repo and SDK, self-serve delete-account and
export path covering API keys, Slack webhooks, and run logs (GDPR
applies to global users even though Pakistan has no comprehensive data
law yet). Never log full Slack webhook URLs or API key values.

## 0.1 PRD-lite

### Problem (from the user's pain, not the technology)

Your backup cron has been failing at 3am for a week. You find out when
a customer emails you, or when you need the backup. Cron has no memory
and no voice: it runs, it fails, it stays silent. Solo devs on VPSs and
PaaS boxes run dozens of these invisible jobs and check them never.

### Primary user + what success looks like for them

Solo developer or two-person team running cron jobs on a VPS, Render,
or anywhere with no built-in job monitoring. Success for them: the
phone buzzes with a Slack message the minute a job fails or goes quiet,
the message names the job and links the failed log, and they fix it
before any customer notices. Second audience (portfolio): hiring
managers evaluating full-stack plus SDK work.

### MVP success criteria (measurable)

1. A wrapped demo job that throws triggers exactly one Slack message
   within 2 minutes of the failure ping, verified live on the deployed
   stack.
2. The dashboard shows status, last run, next expected run, and
   7-day average duration for every job; a job that stops pinging
   flips to Down within one pg_cron tick (60s) plus its grace period,
   verified live.
3. Cold-start onboarding: from the landing page to the first green row
   in under 5 minutes following only the docs page (timed walkthrough).
4. Soak: demo jobs run 48 hours with zero false Late/Down flaps.

### State model (transitions are binding)

Job status is derived, in this order:

1. An open (unresolved) alert exists: Down, or Timed-out when the open
   alert is a timeout.
2. A run is currently in progress: Up.
3. Past the expected run: inside grace_seconds is Late (never alerts);
   grace expired is Down (missed).
4. Otherwise: Up.
5. New: registered via start ping, with no finished run yet or no
   schedule configured. New jobs are excluded from the missed-run
   sweep.

Transitions: a failed finish ping opens a failure alert and sets Down.
The Late-to-Down transition opens a missed alert (exactly one Slack
message). A start ping with no finish past max_runtime_seconds opens a
timeout alert; a late finish ping after that updates duration and logs
but keeps the timed_out status and does not re-fire the alert. A start
ping resolves an open missed alert (the job is running again). One
successful finish ping returns any state to Up, writes resolved_at on
open alerts, sends a recovery Slack message ("Backup is green again"),
and re-arms.

Visual system (identical in table, tick strip, job detail, Slack text):
New is a gray hollow circle; Up is a green check; Late is an amber
clock; Down is a red octagon; Timed-out is a red clock. Slack messages
carry the text label, never color alone.

### First-run flow (v1)

Signup (magic link), create project, API key show-once modal, a
pre-filled snippet screen (the key already in the code block, copy
button), then the dashboard in a "waiting for first ping" state (the
exact code block, not an empty table). The first start ping registers
the job as New; the first success turns the row green with a small
acknowledgment ("Nice work, backup is monitored"). The Slack webhook
is settings-only in v1, so the dashboard shows an "alerts not
configured" warning until a webhook is saved and its test send
succeeds.

### Alert message templates

Failure: job name, project, time, log excerpt (capped), link to job
detail. Missed: job name, expected time vs last seen, link. Timeout:
job name, runtime vs max_runtime, link. Recovery: job name, "green
again", link. Test message: marked [TEST], same shape as a failure
message with placeholder values. A test-send failure renders inline
under the field: "Slack rejected the webhook (HTTP {code}). Check the
URL." Three consecutive failed sends mark the webhook unhealthy: a
badge on the project and a settings banner. Unsent alerts stay queued
(with a visible count) and the check tick retries them with backoff,
giving up after 24 hours.

### Scope IN

- Node SDK: `cron.wrap("job-name", opts, async () => {...})` pings
  start, success, failure (with error text) to the API. `opts` is
  optional and carries the schedule on first registration
  (`{ schedule: "0 3 * * *", timezone: "Asia/Karachi" }`). The wrapped
  function is always async; wrap must be awaited; ping failures never
  throw. SDK lives in the repo under `/sdk`; npm publish is an optional
  human click, not a launch requirement.
- Ingest API at versioned paths (`/v1/`): run start/finish/fail pings,
  per-project API-key auth (SHA-256 hash stored, constant-time
  compare). Per-key rate limit 60 pings/min (429 beyond; the SDK treats
  429 as non-retryable and logs a diagnostic). Request bodies capped at
  32KB.
- Dashboard: every job across servers for the selected project
  (project switcher, not a cross-project table), one dense table:
  status, job name, consecutive-failure count, schedule ("every 5m" or
  the cron expression), last run, next expected run, avg duration
  (7-day window), tick-strip history column (last 30 days, one tick per
  day colored by worst status that day, hollow for no runs). Default
  sort: needs attention first (Down, Timed-out, Late), then by name.
- Job detail: stat strip first (status, success rate, p95 duration,
  executions, alerts, each with its time window), then run history with
  failed logs (missed runs render as synthetic entries from the alerts
  table, visually distinct), alert history under run history, then the
  duration chart (p50 line in v1, window selector 24h/7d/30d), then a
  schedule settings section (schedule kind, cron expression or
  interval, timezone, grace, max runtime).
- Missed-run and stuck-run detection: expected schedule (cron
  expression + IANA timezone) vs actual pings; New / Up / Late / Down /
  Timed-out states; pg_cron every minute calling a bearer-gated check
  endpoint.
- Slack webhook alerts on failure, missed run, and timeout: one Slack
  message per incident until recovery, then re-arm. Per-project webhook
  field with a "test" button (no notification-list abstraction).
- API key management per project: create, name, last-used, revoke.
- Settings: projects, API keys (show-once modal with copy button, an
  "I have copied it" acknowledgment, and an unrecoverable-key warning;
  recovery is revoke plus create new), Slack webhook field with a test
  button, webhook health (badge when recent sends fail, count of
  unsent alerts), self-serve data export, delete account.
- Landing: hero, how-it-works with a real code snippet, free-note, CTA.
- Docs page: SDK install and `wrap()` usage, copy-paste ready.
- Run-history retention policy (success rows 30 days, failure/missed
  rows 90 days), enforced by a scheduled purge.
- Terms + Privacy pages (generated, human-reviewed), self-serve
  delete-account and data export.
- Health endpoint (`/api/health`) plus our own monitor pointed at it.

### Scope OUT (binding)

- Monetization, pricing tiers, billing, Paddle. Free in v1, no card,
  ever. If monetized later, Paddle is the rail (Stripe does not onboard
  Pakistan-registered businesses).
- Teams, orgs, invites, roles. One account, projects belong to the
  account.
- Alert channels other than Slack (no email, SMS, PagerDuty, Discord).
- Public status pages and uptime probing. We monitor cron, not URLs.
- Scheduling jobs. We watch jobs; we never run them.
- Mobile app. Responsive web only.
- Self-hosted packaging or one-click deploy buttons. Repo is public
  MIT; running your own copy is your adventure.
- Log streaming or full log storage. Failed runs keep a capped log
  excerpt; the SDK never ships full stdout.
- Client-side ping batching in the SDK (design hook, not v1).
- Per-environment aggregates (each job row is its own environment).
- Job renaming in v1. The SDK matches jobs by name, so a rename
  orphans the job; renames are disallowed until v2.
- Editing past runs, manual run injection, or backfill.

## 0.2 Foresight (unstated but coming)

BAKE IN NOW (cheap today, expensive later):

1. project_id on every table. Multi-tenancy is one account today, but
   every query is already tenant-scoped; teams later cost nothing extra.
   Why: retrofitting tenant isolation touches every query.
2. deleted_at on projects, jobs, api_keys. Soft delete first, hard
   purge later. Why: a deleted job's runs stay queryable for history,
   and restores are possible.
3. /v1/ versioned ingest paths from day one. Why: the SDK will be
   installed on other people's servers; you cannot force-upgrade them.
4. Idempotency on the ingest path via SDK-generated run_uuid. Why: ping
   retries (flaky networks) must not create duplicate runs.
5. API keys stored as SHA-256 hashes, never raw. Why: a DB read must
   never yield a usable credential.
6. Server-side timestamps on every ping. Why: client clocks lie; skew
   breaks expected-run math silently.
7. Alert dedupe key (job + incident start) with re-arm on recovery.
   Why: without it the first outage teaches users to mute the channel.
8. Slack webhook stored encrypted (pgcrypto, pinned to public schema;
   the encryption key lives in Supabase Vault and a SECURITY DEFINER
   RPC decrypts server-side, callable only with service_role, so the
   Next.js check endpoint gets plaintext without ever storing it).
   Why: webhook URLs are credentials; plaintext storage is a breach
   waiting for a dump.
9. Explicit minimal GRANTs on every new table to service_role; never
   GRANT ALL to anon or authenticated. Why: Supabase grants nothing by
   default since 2026-10-30; missing grants fail with 42501 on day one.
10. IANA timezone stored per job, expected-run math in UTC. Why:
    timezone mismatch is the most common false-alert cause in the wild.

DESIGN HOOKS (do not build, do not block):

11. Notification sender abstraction (one function, Slack today). Why:
    email/SMS later without touching detection code.
12. Billing-metering hooks (count jobs, pings, alerts per project).
    Why: if v2 ever charges, usage history exists.
13. Client-side ping batching hook in the SDK. Why: at 10x volume the
    per-ping invocation cost needs batching; the protocol should allow
    it.

EXPLICITLY DEFERRED (named so nobody discovers them mid-build):

14. Scheduling jobs (running the cron itself). Why deferred: it turns a
    monitor into an execution platform, a different product with
    different trust and security demands.
15. Public status pages. Why deferred: viewer-facing aggregation with
    its own design and caching problems; the operator dashboard is the
    v1 job.

## 0.3 System architecture

### Diagram

```
User's server (anywhere)                    Vercel (Next.js 16)
  cron.wrap("backup", fn)                     ┌─────────────────────┐
   │  start ping (run_uuid)                   │ /v1/runs/start      │
   ├─────────────────────────────────────────▶│ /v1/runs/finish     │──┐
   │  finish ping (run_uuid, ok|err, logs)    │ validate key (hash) │  │
   │                                          │ write runs row      │  │ PostgREST
   └──────────────────────────────────────────│ return 200 fast     │  │ (stateless HTTP)
                                              │ after(): Slack fanout│  │
                                              └─────────────────────┘  │
                                                                     ▼
                                              Supabase Postgres (free tier)
                                              ┌──────────────────────┐
                                              │ projects, api_keys,  │
                                              │ jobs, runs, alerts,  │
                                              │ meta                 │
                                              │ pg_cron: every 60s ──┼──▶ pg_net POST
                                              └──────────────────────┘    /api/cron/check
                                              (bearer-gated; marks        (same Next.js app)
                                              Late/Down/Timed-out,        sweeps alert rows
                                              inserts alert rows)         WHERE sent_at IS NULL
                                                                          and retries sends,
                                                                          writes
                                                                          meta.last_check_at,
                                                                          Slack alerts in
                                                                          after()
Dashboard (same Next.js app, Supabase Auth magic link, anon key + RLS reads)
Slack (incoming webhook per project, URL encrypted at rest)
UptimeRobot (free) ──▶ /api/health (monitors the monitor, keeps Supabase awake)
```

Every arrow is HTTPS. The SDK talks only to `/v1/*`. The dashboard
never touches service_role. pg_cron never talks to Slack directly; it
wakes the Next.js check endpoint, which owns all alert logic (this
keeps the pg_net lock-in replaceable: any external scheduler hitting
the same endpoint works).

### Data model sketch

- projects: id, owner_id (auth.users), name, slack_webhook_enc
  (pgp_sym_encrypt), slack_enabled, deleted_at, created_at.
- api_keys: id, project_id, key_hash (sha256), name, last_used_at
  (updated only when older than one hour, so it does not double ingest
  writes), revoked_at (covers the soft-delete requirement), created_at.
  Raw key shown once at creation, never stored.
- jobs: id, project_id, name (unique per project via a partial unique
  index WHERE deleted_at IS NULL), schedule_kind (cron | interval),
  cron_expr, timezone (IANA), period_seconds,
  grace_seconds (default: clamp(round(period*0.1), 120, 3600)),
  max_runtime_seconds (default 3600), expected_next_run (computed),
  deleted_at, created_at. First ping auto-registers the job (status
  New until first ping).
- runs: id, project_id, job_id, run_uuid (unique, idempotency),
  started_at, finished_at (server clock), status
  (running | success | failed | timed_out), duration_ms, exit_error
  (capped text), log_excerpt (capped text), created_at.
- alerts: id, project_id, job_id, run_id (nullable, ties the alert to
  its run for the "link the failed log" promise), kind (failure |
  missed | timeout), sent_at, resolved_at, channel ('slack'). At most
  one open alert per (job, kind): partial unique index WHERE
  resolved_at IS NULL. One row per incident; re-arm on recovery.
- meta: single-row table (id = 1, last_check_at). The check endpoint
  writes it every tick; settings shows "last check ran X ago".
- Enforcement: the 10-jobs-per-account limit is enforced at ingest.
  The first ping for an 11th job returns 429 job_limit_reached and the
  SDK logs a diagnostic; the job runs unmonitored, it never throws.

### Alert pipeline

Claim-then-send: the check endpoint and the ingest `after()` path both
create alert rows with INSERT ... ON CONFLICT DO NOTHING against the
partial unique index, and send Slack only when the insert claimed the
row. The check tick also sweeps alert rows WHERE sent_at IS NULL for
all three kinds and claims them atomically
(UPDATE ... WHERE sent_at IS NULL), so a crashed isolate loses nothing:
the row exists and the next tick retries it. Retries back off; after
24 hours of failed sends the alert is marked send_failed (the row and
its history stay). pg_net is fire-and-forget with no retry, which is
safe here because every tick recomputes from expected times: a failed
tick or a Vercel outage self-heals on the next successful tick, and
only alert latency suffers, never correctness. The check endpoint's
bearer is CRON_SECRET: generated at deploy time, stored in Supabase
Vault for the pg_net call (never inline in the cron.schedule SQL), and
set as a Vercel env var with the same value. Residual exposure: pg_net
stages the decrypted key in net.http_request_queue, readable by DB
logins; accepted for v1, named here.

### Retention purge

Retention is enforced by pg_cron running chunked DELETEs directly (no
HTTP hop, no Vercel invocation): success runs older than 30 days,
failed/missed/timed-out runs older than 90 days, alerts resolved more
than 90 days ago, jobs soft-deleted more than 90 days ago. Stale
"running" rows older than twice their max_runtime are marked timed_out
by the check tick before the purge can see them.

### Non-functional budgets

- Ingest p95 under 300ms: validate key, insert run row, return. Slack
  fanout and evaluation run in `after()`, never in the request path.
- Detection latency: missed run marked within one pg_cron tick (60s)
  plus grace; Slack message within 60s of detection.
- Dashboard: list pages under 1.5s, no N+1 (one query per list with
  lateral/aggregate subqueries).
- Data-loss tolerance: pings are best-effort. SDK retries 3x with
  backoff, then gives up and logs a diagnostic; the job itself never
  blocks. A lost finish ping degrades to "timed out" via max_runtime,
  never to silence.
- Uptime target: best effort on free tiers, stated honestly. Our own
  monitor (UptimeRobot on /api/health) is the canary.
- Security baseline: OWASP basics; all inputs validated; keys hashed;
  service_role server-side only; RLS enabled with owner-scoped
  permissive policies only (no broad policies) for dashboard reads via
  the anon key; runs/alerts policies scope through jobs to projects via
  EXISTS subqueries; Slack URLs encrypted; no secrets in code, logs,
  or chat.

### What breaks first at 10x / 100x

- 10x: Supabase 500 MB fills (retention policy + purge cron is the
  preemptive answer); Vercel 1M invocations/mo (the batching design
  hook becomes real work).
- 100x: one pg_cron loop doing every project (shard the sweep by
  project hash); PostgREST insert throughput on the runs table (move to
  batched writes); Slack rate limits per webhook (per-project queue).

### Third-party exit strategies

- Supabase Postgres: plain tables, pg_dump to Neon/RDS anytime. Auth is
  open-source GoTrue: bcrypt hashes in auth.users and the JWT signing
  key are exportable, so auth migrates without password resets.
- Vercel: standard Next.js, no edge-only APIs in the hot path; the only
  lock-in is vercel.json (unused in v1, pg_cron replaces it) plus
  deployment itself. `after()` has a Node fallback path documented in
  an ADR.
- Slack webhooks: behind the notification sender abstraction; swapping
  to another channel is one function.
- pg_cron + pg_net: the check endpoint is provider-agnostic; an
  external scheduler (cron-job.org free tier) can wake it if we ever
  leave Supabase.

### ADRs

1. pg_cron (every 60s) drives missed-run detection, not Vercel Cron.
   Context: Hobby cron runs at most once per day, firing anywhere in
   the hour. Decision: a pg_cron job calls the bearer-gated
   /api/cron/check endpoint via pg_net; all sweep + alert logic lives
   in Next.js. Consequences: 60s detection cadence on the free tier;
   pg_cron runs in UTC (the schedule is a plain every-minute tick, so
   no local-time SQL is needed; all timezone math lives in Next.js);
   if we leave Supabase, any external scheduler can wake the same
   endpoint.
2. Slack fanout happens in `after()`, not in the request path.
   Context: ingest must stay under 300ms p95 and never fail because
   Slack is slow. Decision: the request writes rows and returns; alert
   sends run post-response. Consequences: a crashed isolate can lose an
   alert send (accepted; the alert row exists and the next check tick
   retries unsent alerts, which is the load-bearing mitigation).
   after() on the Hobby tier is unverified: phase-6 must confirm alert
   sends fire; if they do not, the check tick becomes the primary sender
   and ingest only writes rows.
3. Server timestamps, never client timestamps. Context: user servers
   have skewed clocks. Decision: started_at/finished_at are set on
   receipt; expected runs derive from the stored cron expression +
   timezone. Consequences: sub-second duration accuracy is approximate;
   no clock-sync burden on users.
4. API keys are SHA-256 hashes compared in constant time. Context: a DB
   read must never yield a usable credential. Decision: raw key shown
   once at creation, only the hash stored. Consequences: key lookup
   needs the hash first (one indexed query); rotation = create + revoke.
5. service_role stays server-side; dashboard reads use the anon key
   behind RLS. Context: the key must never reach the browser (not even
   via RSC props). Decision: ingest and the check endpoint use
   service_role; all dashboard data goes through RLS policies scoped to
   owner_id. Consequences: RLS policies are load-bearing and get their
   own tests.
6. The SDK has a synchronous-flush contract: `wrap` must be awaited.
   Context: in-flight pings die if the process exits. Decision: pings
   are awaited inside wrap; `process.exit()` inside a wrapped job is
   documented as unsupported. Consequences: one honest limitation in
   the docs instead of unreliable flush hacks.
7. Expected-run math is hand-rolled over Intl, no new dependency.
   Context: cron-expression parsing plus IANA-timezone-aware
   next-occurrence computation (with the repeated-hour DST rule) is the
   riskiest hand-rolled code in the build. Decision: implement it in
   plain JS on Intl, owned line by line, and make the dst_transition
   and grace_boundary tests brutal. Consequences: no dependency to
   audit or outgrow; the phase-3 estimate assumes this is the hardest
   single unit.

## 0.4 Risk register

| Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Demand is unvalidated (no real user conversations; portfolio project in a space with strong free incumbents) | High | High | Launch checklist includes posting a Show HN + r/selfhosted with the live demo; record honestly if nobody bites; the portfolio value (SDK + full-stack demo) holds regardless | Abdullah + agent |
| Supabase free DB hits 500 MB and goes read-only | Medium | High | Retention policy is a v1 feature, not polish: purge cron deletes success runs older than 30 days and failure runs older than 90 days; dashboard shows storage honestly | agent |
| Vercel Hobby invocation cap (1M/mo, about 23 pings/min sustained) throttles ingest | Medium | High | Per-key rate limit (60/min, 429 beyond) stops runaway loops; dashboard shows estimated invocation usage; batching is the designed hook at 10x | agent |
| Alert sends fail silently (bad webhook, Slack outage) | Medium | High | Webhook health badge plus settings banner after 3 consecutive failures; unsent alerts counted and retried by the tick with backoff, give-up after 24h; delivery outcome events (alert_delivered, alert_delivery_failed) instrumented | agent |
| False alerts destroy trust (timezone mismatch, DST, flaky pings) | Medium | High | Late/Down two-stage state; per-job IANA timezone; documented DST rule (repeated hour = one window); never alert on a single missed ping; the seven preventive tests are mandatory in phase-3 | agent |
| The monitor itself goes down silently (free-tier pause, deploy break) | Medium | High | UptimeRobot on /api/health (also keeps Supabase awake); pg_cron is in-DB so it survives Vercel deploys; status of the monitor is on the settings page | Abdullah (clicks) + agent |
| Magic-link sign-in fails on launch day (SMTP + site URL defaults) | Medium | Medium | Deploy checklist names both clicks explicitly (custom SMTP via Resend free, site URL + redirect URLs to the live domain) before the first sign-in; verified on the project-2 and project-3 launches | Abdullah |
| SDK ping latency or failure slows a user's real job | Low | High | try/catch + 10s timeout on every ping; pings awaited but never thrown; sdk_never_crashes_job test; documented honestly | agent |
| Scope creep: "just add email alerts / teams / status pages" | Medium | Medium | OUT list is binding; additions need Abdullah's explicit yes; phase-6 parks OUT items for v2 with one-line rationales | Abdullah |

## 0.5 Marketing & launch plan

### Positioning

"Know the minute a cron job fails, not when customers tell you."
Category: dead man's switch for cron jobs. Unlike Healthchecks.io
(passive pings, generous free tier we do not try to beat) and Cronitor
(paid depth), we are the one-line Node wrapper: `wrap()` your function
and get duration, failed logs, and Slack alerts with zero dashboard
form-filling. Free, no card, open source.

### Landing page outline

1. Hero: the one-line pitch, a 3-line code snippet
   (`wrap("nightly-backup", runBackup)`), CTA "Get your API key".
2. How-it-works: three steps (install SDK, wrap the job, get Slack
   alerts), each with real code or a real screenshot.
3. Three pain-tied feature blocks: silent failures (the 3am story),
   failed logs attached to the alert (no more SSH-ing at dawn),
   missed runs vs slow runs (Late vs Down, honest about what we detect).
4. Live demo strip: a real failing demo job and its Slack alert,
   screenshotted from the deployed product.
5. Free note: free in v1, no card, MIT-licensed SDK. (Not a pricing
   table; there is nothing to price.)
6. FAQ handling the top 3 objections: who monitors the monitor
   (UptimeRobot on our health endpoint, stated plainly); "isn't this
   just a dead man's switch" (yes, plus the wrapper captures what the
   job did); alert fatigue (one message per incident until recovery,
   Late never pages).
7. Final CTA: docs page.

### Analytics events plan (instrumented as built, never retrofitted)

1. landing_viewed 2. docs_viewed 3. signup_completed
4. project_created 5. api_key_created 6. sdk_snippet_copied
7. first_ping_received 8. job_first_green (first success ping)
9. job_first_alert (a real failure during launch week)
10. slack_webhook_saved 11. slack_test_sent 12. slack_test_failed
13. alert_sent 14. alert_delivered 15. alert_delivery_failed
16. alert_recovered 17. job_detail_viewed. Seventeen events, all
server-side where the data lives.

### Launch checklist (in order)

1. Deploy + verify (phase-6): signed-in sweep, ingest round-trip,
   pg_cron tick marks a stale demo job Down, failing demo job fires one
   Slack message.
2. Seed one public demo project (a job that fails on demand) for the
   screenshots.
3. README as if strangers read it: 5-minute quickstart (install, wrap,
   watch the dashboard).
4. Post Show HN with the live demo + repo link; post to r/selfhosted
   and r/devops; answer two StackOverflow cron-monitoring questions
   with docs links (Cronitor's guerrilla playbook).
5. Record the outcome honestly in the log, whatever it is. No waitlist:
   a free portfolio tool with nothing to sell does not need one.

## 0.6 Delivery plan

Calibrated against the research: Healthchecks shipped the core in ~1
month of spare time on a boring stack; Cronitor took 8-10 weeks of
nights and cut history, durations, and emails from v1; CronBuzz took 3
months. Our scope is Healthchecks-core plus the wrapper and Slack,
which fits one focused week only if supporting features stay minimal.
Auth, alerting, and retention typically cost 2-3x the core feature, so
the backend day (Nov 6) is the tightest: if it overruns, cuts come
from the OUT list and from the duration-chart percentile toggles (ship
the p50 line first, add p90/p99 later), never from tests,
verification, or the docs page (criterion 3 depends on it).

| Day | Phase | Output | Done means |
|---|---|---|---|
| Mon 11-02 | phase-0 | PLAN.md (this) | approved by Abdullah |
| Tue 11-03 | phase-1 | DESIGN.md | tokens + flows approved |
| Wed 11-04 | phase-2 | component set | demoable against tokens |
| Thu 11-05 | design-copy | DESIGN-COPY.md | every screen specced, approved |
| Fri 11-06 | phase-3 | backend + SDK | every endpoint tested, the seven preventive tests green, seed script works |
| Sat 11-07 | phase-4 | frontend | every blueprint screen built, analytics instrumented |
| Sun 11-08 | phase-5 | polish + QA | screenshots viewed per screen, 375/768/1440px, top friction fixed |
| Mon 11-09 | phase-6 | launch readiness | deploy verified live incl. the Slack alert demo, README + Terms + Privacy done |

Commits: 5-15 per day target is the blueprint's; this program's rule
stands (small, atomic, real work only, no padding).

### Assumptions log

1. Solo devs will trade a Healthchecks account for a better Node
   wrapper. Validate by: Show HN + r/selfhosted response at launch.
2. Slack webhooks are enough alerting for v1 (no email). Validate by:
   nobody asks for email in the first week of launch posts.
3. pg_cron every 60s is an acceptable detection cadence. Validate by:
   the demo (missed job detected within ~1 min + grace).
4. One project per account is enough for v1 (no teams). Validate by:
   launch feedback; teams are the top OUT-list candidate for v2.
5. Free-tier limits (Vercel 1M invocations, Supabase 500 MB) hold for a
   portfolio-scale launch. Validate by: dashboard counters during
   launch week.

## Decisions needed (Abdullah answers before approval)

1. Free limits: propose 10 jobs per account, success runs kept 30 days,
   failure/missed runs kept 90 days, one Slack webhook per project.
   Approve, or set different numbers?
2. Alert behavior: alert immediately on a failed run, and on the
   Late-to-Down transition for missed runs; exactly one Slack message
   per incident until recovery, then re-arm; a recovery message
   ("green again") is sent on resolution. Approve?
3. Job registration: the SDK auto-registers a job on its first ping
   (status New until its first finished run); no manual "create job"
   form in v1. Approve?
4. Schedule input: `wrap(name, { schedule, timezone }, fn)` sets the
   schedule on first registration, and the job detail page carries a
   schedule settings section (kind, cron expression or interval,
   timezone, grace, max runtime) as the escape hatch. Jobs with no
   schedule stay New and are excluded from the missed-run sweep.
   Timezone is required for detection. Approve?
5. SDK distribution: vendored in the repo under `/sdk`; npm publish is
   a manual click you do only if you want it. Approve?
6. Landing "pricing": a free-note section, no pricing table (nothing
   is sold in v1). Approve?
