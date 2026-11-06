-- 0001: core tables for Cron Job Observatory.
-- Run in the Supabase SQL editor, in order. New projects install
-- pgcrypto into the extensions schema by default; pin it to public
-- here so the webhook RPCs in 0002 find it.

create extension if not exists pgcrypto with schema public;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null check (char_length(name) between 1 and 128),
  slack_webhook_enc bytea,
  slack_enabled boolean not null default false,
  slack_test_succeeded_at timestamptz,
  slack_consecutive_failures integer not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  key_hash text not null unique,
  name text not null check (char_length(name) between 1 and 128),
  last_used_at timestamptz,
  revoked_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists api_keys_project_idx on public.api_keys(project_id);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  name text not null check (char_length(name) between 1 and 128),
  schedule_kind text not null default 'none'
    check (schedule_kind in ('none', 'cron', 'interval')),
  cron_expr text,
  timezone text not null default 'UTC',
  period_seconds integer,
  grace_seconds integer not null default 300,
  max_runtime_seconds integer not null default 3600,
  expected_next_run timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
-- One live job per name per project. Deleted names stay reserved
-- until the retention purge clears the row (docs, section 5).
drop index if exists jobs_live_name_idx;
create unique index jobs_live_name_idx
  on public.jobs(project_id, name) where deleted_at is null;
create index if not exists jobs_project_idx on public.jobs(project_id);

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  job_id uuid not null references public.jobs(id),
  run_uuid uuid not null unique,
  started_at timestamptz not null,
  finished_at timestamptz,
  status text not null default 'running'
    check (status in ('running', 'success', 'failed', 'timed_out')),
  duration_ms integer,
  exit_error text,
  log_excerpt text,
  created_at timestamptz not null default now()
);
create index if not exists runs_job_started_idx
  on public.runs(job_id, started_at desc);
create index if not exists runs_running_idx
  on public.runs(job_id, started_at) where status = 'running';

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  job_id uuid not null references public.jobs(id),
  run_id uuid references public.runs(id),
  kind text not null check (kind in ('failure', 'missed', 'timeout')),
  channel text not null default 'slack',
  message text not null default '',
  sent_at timestamptz,
  sending_started_at timestamptz,
  send_attempts integer not null default 0,
  send_failed boolean not null default false,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
-- At most one open alert per (job, kind). The claim-then-send
-- pipeline inserts ON CONFLICT DO NOTHING against this index.
create unique index if not exists alerts_open_idx
  on public.alerts(job_id, kind) where resolved_at is null;
create index if not exists alerts_unsent_idx
  on public.alerts(created_at) where sent_at is null and send_failed = false;
create index if not exists alerts_job_idx
  on public.alerts(job_id, created_at desc);

create table if not exists public.meta (
  id integer primary key,
  last_check_at timestamptz
);
insert into public.meta (id) values (1) on conflict (id) do nothing;

-- RLS on, no permissive policy for anon. Dashboard reads go through
-- the anon key behind owner-scoped SELECT policies; all writes go
-- through service_role API routes after a session check.
alter table public.projects enable row level security;
alter table public.api_keys enable row level security;
alter table public.jobs enable row level security;
alter table public.runs enable row level security;
alter table public.alerts enable row level security;
alter table public.meta enable row level security;

drop policy if exists projects_owner_select on public.projects;
create policy projects_owner_select on public.projects
  for select to authenticated using (owner_id = auth.uid());

drop policy if exists api_keys_owner_select on public.api_keys;
create policy api_keys_owner_select on public.api_keys
  for select to authenticated using (exists (
    select 1 from public.projects p
    where p.id = api_keys.project_id and p.owner_id = auth.uid()));

drop policy if exists jobs_owner_select on public.jobs;
create policy jobs_owner_select on public.jobs
  for select to authenticated using (exists (
    select 1 from public.projects p
    where p.id = jobs.project_id and p.owner_id = auth.uid()));

drop policy if exists runs_owner_select on public.runs;
create policy runs_owner_select on public.runs
  for select to authenticated using (exists (
    select 1 from public.jobs j
    join public.projects p on p.id = j.project_id
    where j.id = runs.job_id and p.owner_id = auth.uid()));

drop policy if exists alerts_owner_select on public.alerts;
create policy alerts_owner_select on public.alerts
  for select to authenticated using (exists (
    select 1 from public.jobs j
    join public.projects p on p.id = j.project_id
    where j.id = alerts.job_id and p.owner_id = auth.uid()));

-- Explicit minimal grants. service_role bypasses RLS but not grants.
grant select, insert, update, delete
  on public.projects, public.api_keys, public.jobs,
     public.runs, public.alerts, public.meta
  to service_role;
grant select on public.projects, public.api_keys, public.jobs,
  public.runs, public.alerts to authenticated;
