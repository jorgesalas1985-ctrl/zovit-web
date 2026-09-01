-- Sprint 34: excepción manual de identidad, limitada al owner real configurado en DB.
-- La fila de intranet_owner_config se inicializa fuera del repositorio mediante administración DB.

create table if not exists public.intranet_owner_config (
  singleton boolean primary key default true check (singleton),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  initialized_at timestamptz not null default now()
);

alter table public.intranet_owner_config enable row level security;
revoke all privileges on table public.intranet_owner_config from public;
revoke all privileges on table public.intranet_owner_config from anon;
revoke all privileges on table public.intranet_owner_config from authenticated;

create table if not exists public.intranet_identity_manual_override_audit (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  previous_identity_status text not null,
  affected_document_count integer not null check (affected_document_count >= 0),
  created_at timestamptz not null default now()
);

alter table public.intranet_identity_manual_override_audit enable row level security;
revoke all privileges on table public.intranet_identity_manual_override_audit from public;
revoke all privileges on table public.intranet_identity_manual_override_audit from anon;
revoke all privileges on table public.intranet_identity_manual_override_audit from authenticated;

create or replace function public.intranet_manual_override_identity_verification(
  p_profile_id uuid,
  p_confirmation text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  configured_owner_id uuid;
  actor_intranet_role text;
  target_intranet_role text;
  target_identity_status text;
  updated_profile_count integer;
  updated_document_count integer;
  now_ts timestamptz := now();
begin
  if actor_id is null then
    raise exception 'Acceso no autorizado';
  end if;

  select owner_user_id
    into configured_owner_id
  from public.intranet_owner_config
  where singleton = true;

  if configured_owner_id is null or actor_id <> configured_owner_id then
    raise exception 'Acceso no autorizado';
  end if;

  select intranet_role
    into actor_intranet_role
  from public.profiles
  where id = actor_id;

  if actor_intranet_role <> 'super_admin' then
    raise exception 'Acceso no autorizado';
  end if;

  if p_confirmation <> 'APROBAR SIN VERIFICACION' then
    raise exception 'Confirmación de seguridad incorrecta';
  end if;

  select identity_status, intranet_role
    into target_identity_status, target_intranet_role
  from public.profiles
  where id = p_profile_id
  for update;

  if not found then
    raise exception 'No se encontró la cuenta';
  end if;

  if target_intranet_role = 'super_admin' then
    raise exception 'La cuenta protegida del superadministrador no usa esta excepción';
  end if;

  if target_identity_status <> 'pending' then
    raise exception 'La identidad debe estar pendiente para usar esta excepción';
  end if;

  update public.profiles
  set
    identity_status = 'approved',
    identity_verified = true,
    biometric_verified = true,
    identity_verified_at = now_ts,
    identity_rejection_reason = null,
    identity_ai_status = 'manual_override',
    identity_ai_summary = format('Aprobación excepcional sin OCR autorizada por superadministrador el %s.', now_ts),
    identity_ai_at = now_ts,
    birth_date_admin_corroborated = false,
    birth_date_admin_corroborated_at = null,
    birth_date_admin_corroborated_by = actor_id,
    updated_at = now_ts
  where id = p_profile_id
    and identity_status = 'pending';
  get diagnostics updated_profile_count = row_count;

  if updated_profile_count <> 1 then
    raise exception 'La identidad debe estar pendiente para usar esta excepción';
  end if;

  update public.identity_documents
  set
    status = 'approved',
    reviewed_by = actor_id,
    reviewed_at = now_ts,
    admin_notes = 'Aprobación excepcional sin verificación automática, autorizada por superadministrador.',
    updated_at = now_ts
  where profile_id = p_profile_id;
  get diagnostics updated_document_count = row_count;

  insert into public.intranet_identity_manual_override_audit (
    profile_id,
    actor_id,
    previous_identity_status,
    affected_document_count
  ) values (
    p_profile_id,
    actor_id,
    target_identity_status,
    updated_document_count
  );
end;
$$;

revoke all on function public.intranet_manual_override_identity_verification(uuid, text) from public;
grant execute on function public.intranet_manual_override_identity_verification(uuid, text) to authenticated;
