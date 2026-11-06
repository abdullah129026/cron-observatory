-- 0002: Slack webhook encrypt/decrypt RPCs.
-- The webhook URL is a credential, so it is stored encrypted with
-- pgp_sym_encrypt and a key that lives in Supabase Vault. The key
-- itself is never in env or code: create it once in the dashboard
-- (Vault -> New secret, name `webhook_enc_key`, any long random
-- string). The name is hardcoded here so PostgREST calls need no
-- per-session config.
-- Both RPCs are SECURITY DEFINER, executable by service_role only.

create or replace function public.set_project_webhook(
  p_project_id uuid,
  p_url text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text;
begin
  select decrypted_secret into v_key
  from vault.decrypted_secrets
  where name = 'webhook_enc_key';
  if v_key is null then
    raise exception 'webhook encryption key not found in Vault';
  end if;
  update public.projects
  set slack_webhook_enc = pgp_sym_encrypt(p_url, v_key),
      slack_enabled = true,
      slack_consecutive_failures = 0
  where id = p_project_id and deleted_at is null;
end;
$$;

create or replace function public.get_project_webhook(
  p_project_id uuid
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text;
  v_enc bytea;
begin
  select slack_webhook_enc into v_enc
  from public.projects
  where id = p_project_id and deleted_at is null;
  if v_enc is null then
    return null;
  end if;
  select decrypted_secret into v_key
  from vault.decrypted_secrets
  where name = 'webhook_enc_key';
  if v_key is null then
    raise exception 'webhook encryption key not found in Vault';
  end if;
  return pgp_sym_decrypt(v_enc, v_key);
end;
$$;

revoke all on function public.set_project_webhook(uuid, text) from public;
revoke all on function public.get_project_webhook(uuid) from public;
grant execute on function public.set_project_webhook(uuid, text) to service_role;
grant execute on function public.get_project_webhook(uuid) to service_role;
