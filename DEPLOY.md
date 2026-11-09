# Deploy guide

Everything here is a click you do, in order. Nothing in this file needs
code changes. The app is Next.js 16 on Vercel, Postgres + Auth on
Supabase (free tiers). If Vercel gives the project a different domain
than `cron-observatory.vercel.app`, use your real domain everywhere
this file says `<APP_URL>`.

## 0. What you need

- A Supabase account (free) and a Vercel account (free).
- A Slack workspace where you can create an incoming webhook (for the
  alert demo).
- Optional: a Resend account (free, 100 emails/day) for sign-in emails,
  and an UptimeRobot account (free) for the uptime monitor.

## 1. Create the Supabase project

1. Supabase dashboard → New project. Name it `cron-observatory`.
   Note the project ref (the subdomain in the URL).
2. SQL Editor → New query. Paste `supabase/migrations/0001_schema.sql`,
   run it. Repeat for `0002_rpc.sql`, then `0003_rpc_alerts.sql`, in
   that order. Each should report success.
3. Check Table Editor shows: `projects`, `api_keys`, `jobs`, `runs`,
   `alerts`, `meta`.

## 2. Generate the shared secret

`CRON_SECRET` is the bearer token the check tick uses. Generate one
random string and reuse the same value in step 3 and step 5. In Git
Bash:

```sh
openssl rand -hex 32
```

## 3. Store the two Vault secrets

Supabase dashboard → Database → Vault (or SQL Editor):

```sql
select vault.create_secret('<WEBHOOK_KEY>', 'webhook_enc_key');
select vault.create_secret('<CRON_SECRET>', 'cron_check_secret');
```

- `webhook_enc_key`: any long random string, for Slack webhook encryption.
- `cron_check_secret`: the `CRON_SECRET` value from step 2.

## 4. Import on Vercel and set env vars

1. Vercel → Add New → Project → import `abdullah129026/cron-observatory`.
2. Environment Variables (Production), six values:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://<project-ref>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon key (Project Settings → API)
   - `SUPABASE_URL` = same URL as above
   - `SUPABASE_SERVICE_ROLE_KEY` = service_role key (Project Settings → API)
   - `CRON_SECRET` = the value from step 2
   - `NEXT_PUBLIC_APP_URL` = `https://<APP_URL>`
3. Deploy. Wait until the deployment carries the Production label.

## 5. Audit the Supabase site URL before the first sign-in

Authentication → URL Configuration:

- Site URL = `https://<APP_URL>` (the default is localhost; leave it and
  every magic link points at localhost and sign-in fails).
- Redirect URLs: add `https://<APP_URL>/**`.
- Request a fresh magic link after changing this; links sent before
  the fix stay dead.

## 6. Custom SMTP (so anyone can sign in)

The built-in sender only reaches team addresses at 2 emails/hour.
Authentication → Emails → SMTP settings: enable custom SMTP with
Resend (free, 100/day) and your Resend API key. Then set the cap at
Authentication → Rate Limits. Without this step, only Supabase team
members can sign in to the demo.

## 7. Schedule the check tick and the retention purge

1. Open `supabase/pg_cron_setup.sql`, replace `<APP_URL>` with the live
   domain, and run the whole file once in the SQL Editor.
2. Database → Cron jobs: confirm two jobs exist, `cron-check` (every
   minute) and `retention-purge` (daily 03:30 UTC).

## 8. Seed the demo project

```sh
SUPABASE_URL=https://<project-ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
SEED_USER_EMAIL=<the email you signed in with> \
node scripts/seed-demo.mjs
```

It prints `seeded demo-shop: 8 versions` style output for the demo
project (30 days of nightly-backup runs, 2 failures). The landing page
demo strip reads from this project; until it exists the strip renders
hollow ticks with an honest caption.

## 9. Uptime monitor (free tier)

UptimeRobot → Add New Monitor:

- Monitor Type: HTTPS, Friendly Name: `cron-observatory health`.
- URL: `https://<APP_URL>/api/health`.
- Monitoring Interval: 5 minutes. Alert contact: your email.

This monitors the monitor, and its regular hits also keep the Supabase
project awake, which matters because free projects pause after a week
of inactivity.

## 10. Backups (free-tier reality)

Supabase Free has no automatic backups: daily backups kept 7 days are
a Pro feature. Until the service moves to Pro, back up by hand:

```sh
supabase link --project-ref <project-ref>
supabase db dump -f cron-observatory-$(date +%F).sql
```

Store the dump off-site (not in this repo). The in-app export in
Settings is a second copy of your own data, not a database backup.
Upgrade to Pro the moment other people depend on the service: that is
when daily backups and no pausing start mattering.

## 11. Verification sweep

Do this after the deploy lands, against the production domain, and
record the result. A green build proves nothing; this sweep does.

| Route | Expect |
|---|---|
| `/`, `/docs`, `/login`, `/terms`, `/privacy` | 200 |
| `/dashboard`, `/settings`, `/onboarding`, `/jobs/[id]` signed out | 307 to `/login` |
| `/api/health` | 200 with `db: connected` |
| `/api/cron/check` without a bearer token | 401 |

Signed-in check (mandatory, redirects hide crashes): sign in with a
magic link, then open `/dashboard`, `/settings`, and one `/jobs/[id]`
while signed in. All three must render 200.

End-to-end: wrap a test job with the SDK, watch it go green on the
dashboard, then make it fail and confirm exactly one Slack message
arrives. Let a demo job go stale and confirm the tick marks it Down.
Check Vercel → Logs after the sweep; a clean log after the signed-in
check is real evidence.

## 12. Rollback plan

Vercel keeps every deployment: open the project → Deployments, find
the previous production deployment, and use instant rollback. No
migration in this release changes an existing column, so rolling back
code never needs a database rollback. If a migration ever fails
mid-run, re-run it from the file (migrations are written to be safe to
re-run) or restore from the manual dump in step 10. If `CRON_SECRET`
ever leaks, generate a new value, update both the Vercel env var and
the Vault `cron_check_secret`, and redeploy.

## 13. Launch

Launch itself is a human decision, not part of this guide. When it
happens, the plan in `PLAN.md` section 0.5 applies: post Show HN with
the live demo and repo link, post to r/selfhosted and r/devops, and
record the outcome honestly whatever it is.
