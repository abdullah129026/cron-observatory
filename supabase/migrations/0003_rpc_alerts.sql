-- 0003: atomic alert-claim RPCs. PostgREST cannot express
-- INSERT ... ON CONFLICT against a partial unique index, and the
-- claim-then-send pipeline (PLAN 0.3) needs exactly that, so the
-- atomic steps live here. SECURITY DEFINER, service_role only.

-- Claim one open alert per (job, kind). Returns the row when this
-- caller won the claim, null when an open alert already exists.
create or replace function public.claim_alert(
  p_project_id uuid,
  p_job_id uuid,
  p_run_id uuid,
  p_kind text,
  p_message text
) returns setof public.alerts
language sql
security definer
set search_path = public
as $$
  insert into public.alerts (project_id, job_id, run_id, kind, message)
  values (p_project_id, p_job_id, p_run_id, p_kind, p_message)
  on conflict (job_id, kind) where resolved_at is null do nothing
  returning *;
$$;

-- Claim an unsent alert for sending. Atomic: only one tick sends it.
-- A send stuck for over 5 minutes (crashed isolate) is claimable again.
create or replace function public.claim_alert_send(p_alert_id uuid)
returns setof public.alerts
language sql
security definer
set search_path = public
as $$
  update public.alerts
  set sending_started_at = now(), send_attempts = send_attempts + 1
  where id = p_alert_id
    and sent_at is null
    and send_failed = false
    and (sending_started_at is null
      or sending_started_at < now() - interval '5 minutes')
  returning *;
$$;

-- Resolve every open alert for a job. Returns the resolved rows, so
-- the caller knows whether a recovery message is owed.
create or replace function public.resolve_open_alerts(p_job_id uuid)
returns setof public.alerts
language sql
security definer
set search_path = public
as $$
  update public.alerts
  set resolved_at = now()
  where job_id = p_job_id and resolved_at is null
  returning *;
$$;

-- Resolve open alerts of one kind for a job (a start ping resolves
-- a missed alert; the job is running again).
create or replace function public.resolve_alert_kind(
  p_job_id uuid,
  p_kind text
) returns setof public.alerts
language sql
security definer
set search_path = public
as $$
  update public.alerts
  set resolved_at = now()
  where job_id = p_job_id and kind = p_kind and resolved_at is null
  returning *;
$$;

revoke all on function public.claim_alert(uuid, uuid, uuid, text, text) from public;
revoke all on function public.claim_alert_send(uuid) from public;
revoke all on function public.resolve_open_alerts(uuid) from public;
revoke all on function public.resolve_alert_kind(uuid, text) from public;
grant execute on function public.claim_alert(uuid, uuid, uuid, text, text) to service_role;
grant execute on function public.claim_alert_send(uuid) to service_role;
grant execute on function public.resolve_open_alerts(uuid) to service_role;
grant execute on function public.resolve_alert_kind(uuid, text) to service_role;
