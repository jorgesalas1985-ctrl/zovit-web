-- Sprint 42: exclusión distribuida para OCR/IA de identidad automática.
create table if not exists public.intranet_identity_ai_review_claims (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  claim_token uuid not null default gen_random_uuid(),
  status text not null check (status in ('claimed', 'completed')),
  lease_expires_at timestamptz not null,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.intranet_identity_ai_review_claims enable row level security;
revoke all privileges on table public.intranet_identity_ai_review_claims from public, anon, authenticated;

create or replace function public.intranet_claim_identity_ai_review(
  p_profile_id uuid,
  p_include_dudosos boolean default false
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  now_ts timestamptz := now(); profile_status text; ai_status text;
  existing_status text; existing_lease timestamptz; token uuid;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'Acceso no autorizado'; end if;
  select identity_status, identity_ai_status into profile_status, ai_status from public.profiles where id = p_profile_id for update;
  if not found or profile_status <> 'pending' then return null; end if;
  if coalesce(ai_status, 'pending') not in ('pending', 'processing')
     and not (p_include_dudosos and ai_status = 'dudoso') then return null; end if;
  select status, lease_expires_at into existing_status, existing_lease
  from public.intranet_identity_ai_review_claims where profile_id = p_profile_id for update;
  if found and existing_status = 'claimed' and existing_lease > now_ts then return null; end if;
  insert into public.intranet_identity_ai_review_claims as c
    (profile_id, claim_token, status, lease_expires_at, attempt_count, completed_at, updated_at)
  values (p_profile_id, gen_random_uuid(), 'claimed', now_ts + interval '10 minutes', 1, null, now_ts)
  on conflict (profile_id) do update set
    claim_token = gen_random_uuid(), status = 'claimed', lease_expires_at = now_ts + interval '10 minutes',
    attempt_count = c.attempt_count + 1, completed_at = null, updated_at = now_ts
  returning claim_token into token;
  update public.profiles set identity_ai_status = 'processing', identity_ai_at = now_ts, updated_at = now_ts
  where id = p_profile_id and identity_status = 'pending';
  return token;
end;
$$;

create or replace function public.intranet_apply_identity_ai_verdict_automation_claimed(
  p_profile_id uuid, p_claim_token uuid, p_decision text, p_summary text, p_confidence numeric, p_forgery_risk text,
  p_extracted_rut text, p_extracted_birth_date text, p_rejection_reason text, p_automation_secret text,
  p_document_metadata jsonb default '{}'::jsonb
) returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  configured_secret_hash text; config_enabled boolean; config_operation text;
  claim_status text; claim_lease timestamptz; applied text; metadata_entry jsonb; metadata_document_id text;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'Acceso no autorizado'; end if;
  select secret_hash, enabled, operation into configured_secret_hash, config_enabled, config_operation
  from public.intranet_ai_automation_config where singleton = true;
  if configured_secret_hash is null or not coalesce(config_enabled, false) or config_operation <> 'identity_ai_verdict'
     or p_automation_secret is null or crypt(p_automation_secret, configured_secret_hash) <> configured_secret_hash then
    raise exception 'Acceso no autorizado';
  end if;
  select status, lease_expires_at into claim_status, claim_lease
  from public.intranet_identity_ai_review_claims where profile_id = p_profile_id and claim_token = p_claim_token for update;
  if not found or claim_status <> 'claimed' or claim_lease <= now() then raise exception 'Claim IA inválido o vencido'; end if;
  applied := intranet_private.apply_identity_ai_verdict(
    p_profile_id, p_decision, p_summary, p_confidence, p_forgery_risk,
    p_extracted_rut, p_extracted_birth_date, p_rejection_reason, 'automation', null
  );
  for metadata_document_id, metadata_entry in select key, value from jsonb_each(coalesce(p_document_metadata, '{}'::jsonb)) loop
    update public.identity_documents set metadata = coalesce(metadata, '{}'::jsonb) || metadata_entry,
      updated_at = now()
    where id = metadata_document_id::uuid and profile_id = p_profile_id;
  end loop;
  update public.intranet_identity_ai_review_claims set status = 'completed', completed_at = now(), updated_at = now()
  where profile_id = p_profile_id and claim_token = p_claim_token;
  return applied;
end;
$$;

create or replace function public.intranet_fail_identity_ai_review_claim(
  p_profile_id uuid, p_claim_token uuid, p_summary text, p_automation_secret text
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare configured_secret_hash text; config_enabled boolean; config_operation text;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'Acceso no autorizado'; end if;
  select secret_hash, enabled, operation into configured_secret_hash, config_enabled, config_operation from public.intranet_ai_automation_config where singleton = true;
  if configured_secret_hash is null or not coalesce(config_enabled, false) or config_operation <> 'identity_ai_verdict'
     or p_automation_secret is null or crypt(p_automation_secret, configured_secret_hash) <> configured_secret_hash then raise exception 'Acceso no autorizado'; end if;
  perform 1 from public.intranet_identity_ai_review_claims
  where profile_id = p_profile_id and claim_token = p_claim_token and status = 'claimed' and lease_expires_at > now() for update;
  if not found then raise exception 'Claim IA inválido o vencido'; end if;
  update public.profiles set identity_ai_status = 'dudoso', identity_ai_summary = left(coalesce(p_summary, 'Error IA carnet'), 500), identity_ai_at = now(), updated_at = now()
  where id = p_profile_id and identity_status = 'pending';
  update public.intranet_identity_ai_review_claims set status = 'completed', completed_at = now(), updated_at = now()
  where profile_id = p_profile_id and claim_token = p_claim_token;
end;
$$;

revoke all on function public.intranet_claim_identity_ai_review(uuid, boolean) from public;
revoke all on function public.intranet_apply_identity_ai_verdict_automation_claimed(uuid, uuid, text, text, numeric, text, text, text, text, text, jsonb) from public;
revoke all on function public.intranet_fail_identity_ai_review_claim(uuid, uuid, text, text) from public;
grant execute on function public.intranet_claim_identity_ai_review(uuid, boolean) to service_role;
grant execute on function public.intranet_apply_identity_ai_verdict_automation_claimed(uuid, uuid, text, text, numeric, text, text, text, text, text, jsonb) to service_role;
grant execute on function public.intranet_fail_identity_ai_review_claim(uuid, uuid, text, text) to service_role;
