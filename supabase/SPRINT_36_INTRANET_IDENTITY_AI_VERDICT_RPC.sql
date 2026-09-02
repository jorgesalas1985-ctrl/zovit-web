-- Sprint 36: persistencia atómica OCR. La fila del secreto se inicializa fuera del repositorio.
create extension if not exists pgcrypto;

create table if not exists public.intranet_ai_automation_config (
  singleton boolean primary key default true check (singleton),
  secret_hash text not null,
  enabled boolean not null default true,
  operation text not null default 'identity_ai_verdict' check (operation = 'identity_ai_verdict'),
  initialized_at timestamptz not null default now()
);
alter table public.intranet_ai_automation_config enable row level security;
revoke all privileges on table public.intranet_ai_automation_config from public, anon, authenticated;

create table if not exists public.intranet_identity_ai_verdict_audit (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  actor_kind text not null check (actor_kind in ('human', 'automation')),
  actor_id uuid references public.profiles(id) on delete set null,
  requested_decision text not null check (requested_decision in ('approved', 'rejected', 'dudoso')),
  applied_decision text not null check (applied_decision in ('approved', 'rejected', 'dudoso')),
  affected_document_count integer not null check (affected_document_count >= 0),
  created_at timestamptz not null default now()
);
alter table public.intranet_identity_ai_verdict_audit enable row level security;
revoke all privileges on table public.intranet_identity_ai_verdict_audit from public, anon, authenticated;

create schema if not exists intranet_private;
revoke all on schema intranet_private from public;

create or replace function intranet_private.apply_identity_ai_verdict(
  p_profile_id uuid, p_decision text, p_summary text, p_confidence numeric, p_forgery_risk text,
  p_extracted_rut text, p_extracted_birth_date text, p_rejection_reason text, p_actor_kind text, p_actor_id uuid
) returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  target_status text; target_role text; effective_decision text := p_decision; applied_ai_status text;
  protected_summary text := p_summary; now_ts timestamptz := now(); updated_profile_count integer;
  updated_document_count integer := 0; document_notes text;
begin
  if p_decision not in ('approved', 'rejected', 'dudoso') or p_actor_kind not in ('human', 'automation') then raise exception 'Veredicto IA inválido'; end if;
  select identity_status, intranet_role into target_status, target_role from public.profiles where id = p_profile_id for update;
  if not found then raise exception 'Perfil no encontrado'; end if;
  if target_status <> 'pending' then raise exception 'La identidad ya no está pendiente de revisión'; end if;
  if target_role = 'super_admin' and p_decision = 'rejected' then
    effective_decision := 'dudoso'; protected_summary := coalesce(p_summary, '') || ' (super admin protegido: no se rechaza)';
  end if;
  applied_ai_status := effective_decision;
  document_notes := case effective_decision when 'approved' then 'IA auto-aprobó: ' || coalesce(p_summary, '') when 'rejected' then coalesce(nullif(btrim(p_rejection_reason), ''), 'No se pudo validar el carnet automáticamente.') else null end;
  update public.profiles set
    identity_ai_status = applied_ai_status, identity_ai_at = now_ts, identity_ai_summary = protected_summary,
    identity_ai_confidence = p_confidence, identity_ai_forgery_risk = p_forgery_risk,
    identity_ai_extracted_rut = p_extracted_rut, identity_ai_extracted_birth_date = p_extracted_birth_date,
    identity_status = case when effective_decision = 'approved' then 'approved' when effective_decision = 'rejected' then 'rejected' else identity_status end,
    identity_verified = case when effective_decision = 'approved' then true when effective_decision = 'rejected' then false else identity_verified end,
    biometric_verified = case when effective_decision = 'approved' then true when effective_decision = 'rejected' then false else biometric_verified end,
    identity_verified_at = case when effective_decision = 'approved' then now_ts when effective_decision = 'rejected' then null else identity_verified_at end,
    identity_rejection_reason = case when effective_decision = 'approved' then null when effective_decision = 'rejected' then document_notes else identity_rejection_reason end,
    birth_date_admin_corroborated = case when effective_decision = 'approved' then true when effective_decision = 'rejected' then false else birth_date_admin_corroborated end,
    birth_date_admin_corroborated_at = case when effective_decision = 'approved' then now_ts when effective_decision = 'rejected' then null else birth_date_admin_corroborated_at end,
    birth_date_admin_corroborated_by = null, updated_at = now_ts
  where id = p_profile_id and identity_status = 'pending';
  get diagnostics updated_profile_count = row_count;
  if updated_profile_count <> 1 then raise exception 'La identidad ya no está pendiente de revisión'; end if;
  if effective_decision in ('approved', 'rejected') then
    update public.identity_documents set status = effective_decision, reviewed_by = p_actor_id, reviewed_at = now_ts, admin_notes = document_notes, updated_at = now_ts where profile_id = p_profile_id;
    get diagnostics updated_document_count = row_count;
  end if;
  insert into public.intranet_identity_ai_verdict_audit (profile_id, actor_kind, actor_id, requested_decision, applied_decision, affected_document_count)
  values (p_profile_id, p_actor_kind, p_actor_id, p_decision, effective_decision, updated_document_count);
  return effective_decision;
end;
$$;

create or replace function public.intranet_apply_identity_ai_verdict_human(
  p_profile_id uuid, p_decision text, p_summary text, p_confidence numeric, p_forgery_risk text,
  p_extracted_rut text, p_extracted_birth_date text, p_rejection_reason text
) returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare actor_id uuid := auth.uid(); actor_role text;
begin
  if actor_id is null then raise exception 'Acceso no autorizado'; end if;
  select intranet_role into actor_role from public.profiles where id = actor_id;
  if coalesce(actor_role, '') not in ('hr_admin', 'super_admin') then raise exception 'Acceso no autorizado'; end if;
  return intranet_private.apply_identity_ai_verdict(p_profile_id, p_decision, p_summary, p_confidence, p_forgery_risk, p_extracted_rut, p_extracted_birth_date, p_rejection_reason, 'human', actor_id);
end;
$$;

create or replace function public.intranet_apply_identity_ai_verdict_automation(
  p_profile_id uuid, p_decision text, p_summary text, p_confidence numeric, p_forgery_risk text,
  p_extracted_rut text, p_extracted_birth_date text, p_rejection_reason text, p_automation_secret text
) returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare configured_secret_hash text; config_enabled boolean; config_operation text;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'Acceso no autorizado'; end if;
  select secret_hash, enabled, operation into configured_secret_hash, config_enabled, config_operation from public.intranet_ai_automation_config where singleton = true;
  if configured_secret_hash is null or not coalesce(config_enabled, false) or config_operation <> 'identity_ai_verdict' or p_automation_secret is null or crypt(p_automation_secret, configured_secret_hash) <> configured_secret_hash then raise exception 'Acceso no autorizado'; end if;
  return intranet_private.apply_identity_ai_verdict(p_profile_id, p_decision, p_summary, p_confidence, p_forgery_risk, p_extracted_rut, p_extracted_birth_date, p_rejection_reason, 'automation', null);
end;
$$;

revoke all on function intranet_private.apply_identity_ai_verdict(uuid, text, text, numeric, text, text, text, text, text, uuid) from public;
revoke all on function public.intranet_apply_identity_ai_verdict_human(uuid, text, text, numeric, text, text, text, text) from public;
revoke all on function public.intranet_apply_identity_ai_verdict_automation(uuid, text, text, numeric, text, text, text, text, text) from public;
grant execute on function public.intranet_apply_identity_ai_verdict_human(uuid, text, text, numeric, text, text, text, text) to authenticated;
grant execute on function public.intranet_apply_identity_ai_verdict_automation(uuid, text, text, numeric, text, text, text, text, text) to service_role;
