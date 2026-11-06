-- pg_cron + retention setup. NOT a migration: run it once by hand in
-- the Supabase SQL editor at deploy time, after the app is live.
-- It needs two real values, so it cannot live in a migration file.
--
-- 1. Store CRON_SECRET in Vault (same value as the Vercel env var):
--    select vault.create_secret('<CRON_SECRET>', 'cron_check_secret');
-- 2. Replace <APP_URL> below with the live Vercel origin
--    (https://cron-observatory.vercel.app) and run this file.
-- 3. Confirm in the dashboard: Database -> Cron jobs shows both jobs.

-- Every minute: wake the check endpoint. All sweep and alert logic
-- lives in Next.js; pg_cron only wakes it. pg_net is fire-and-forget
-- with no retry, which is safe here because every tick recomputes
-- from expected times: a failed tick self-heals on the next one.
select cron.schedule(
  'cron-check',
  '* * * * *',
  $$
  select net.http_post(
    url := '<APP_URL>/api/cron/check',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'cron_check_secret'
      ),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Daily retention purge, chunked deletes straight in the DB (no HTTP
-- hop, no Vercel invocation): success runs older than 30 days,
-- failed/missed/timed-out runs older than 90 days, alerts resolved
-- more than 90 days ago, jobs soft-deleted more than 90 days ago.
-- Stale "running" rows are marked timed_out by the check tick before
-- the purge can see them. Runs for a soft-deleted job stay until the
-- job row itself is purged, so the 90-day name quarantine holds.
select cron.schedule(
  'retention-purge',
  '30 3 * * *',
  $$
  delete from public.runs
  where status = 'success' and created_at < now() - interval '30 days';
  delete from public.runs
  where status in ('failed', 'timed_out') and created_at < now() - interval '90 days';
  delete from public.alerts
  where resolved_at is not null and resolved_at < now() - interval '90 days';
  delete from public.jobs
  where deleted_at is not null and deleted_at < now() - interval '90 days';
  delete from public.api_keys
  where deleted_at is not null and deleted_at < now() - interval '90 days';
  delete from public.projects
  where deleted_at is not null and deleted_at < now() - interval '90 days';
  $$
);
