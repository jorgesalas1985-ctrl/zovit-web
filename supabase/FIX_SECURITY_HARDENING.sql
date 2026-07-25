-- ZOVIT perimeter hardening: privilege lock, safe signup, masked credential RUT.
-- Apply in production after review.

-- ─── 1) Block self-service privilege escalation on profiles ───────────────────

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
-- INVOKER on purpose: security definer would always run as postgres and never block.
set search_path = public
as $$
begin
  -- Admin API (service_role) and trusted DB roles / security-definer RPCs.
  if current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;

  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.role is distinct from old.role
      or new.intranet_role is distinct from old.intranet_role
      or new.identity_status is distinct from old.identity_status
      or new.identity_verified is distinct from old.identity_verified
      or new.identity_verified_at is distinct from old.identity_verified_at
      or new.biometric_verified is distinct from old.biometric_verified
      or new.study_verification_status is distinct from old.study_verification_status
      or new.study_verified is distinct from old.study_verified
      or new.can_act_as_client is distinct from old.can_act_as_client
      or new.can_act_as_professional is distinct from old.can_act_as_professional
    then
      raise exception 'Operación denegada: no puedes modificar privilegios o verificación del perfil.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_profile_privileges on public.profiles;
create trigger trg_protect_profile_privileges
  before update on public.profiles
  for each row
  execute function public.protect_profile_privileges();

-- Trusted RPCs must bypass the guard (they run as postgres via security definer,
-- so current_user is already postgres — no change needed if owned by postgres).

-- ─── 2) Signup: never accept admin / intranet_role from client metadata ───────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta_role text := lower(coalesce(new.raw_user_meta_data ->> 'role', 'client'));
  v_role text;
begin
  -- Only client | professional from public signup. Never admin.
  if v_meta_role = 'professional' then
    v_role := 'professional';
  else
    v_role := 'client';
  end if;

  insert into public.profiles (
    id,
    first_name,
    last_name,
    phone,
    address,
    commune,
    rut,
    role,
    intranet_role,
    can_act_as_client,
    can_act_as_professional,
    active_mode
  )
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'address',
    new.raw_user_meta_data ->> 'commune',
    new.raw_user_meta_data ->> 'rut',
    v_role,
    null,
    v_role = 'client',
    v_role = 'professional',
    case when v_role = 'professional' then 'professional' else 'client' end
  )
  on conflict (id) do update set
    first_name = coalesce(excluded.first_name, public.profiles.first_name),
    last_name = coalesce(excluded.last_name, public.profiles.last_name),
    phone = coalesce(excluded.phone, public.profiles.phone),
    address = coalesce(excluded.address, public.profiles.address),
    commune = coalesce(excluded.commune, public.profiles.commune),
    rut = coalesce(excluded.rut, public.profiles.rut),
    -- Never overwrite role / privileges from signup metadata on conflict.
    updated_at = now();

  return new;
end;
$$;

-- ─── 3) Public credential: mask RUT (PII) ─────────────────────────────────────

create or replace function public.get_public_credential(p_profile_id uuid)
returns table (
  id uuid,
  first_name text,
  last_name text,
  rut text,
  role text,
  avatar_url text,
  identity_verified boolean,
  biometric_verified boolean,
  study_verified boolean,
  identity_status text,
  experience_level text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id,
    p.first_name,
    p.last_name,
    case
      when p.rut is null or length(regexp_replace(p.rut, '[^0-9kK]', '', 'g')) < 5 then null
      else '******-' || right(regexp_replace(upper(p.rut), '[^0-9K]', '', 'g'), 1)
    end as rut,
    p.role,
    p.avatar_url,
    coalesce(p.identity_verified, false),
    coalesce(p.biometric_verified, false),
    coalesce(p.study_verified, false),
    coalesce(p.identity_status, 'none'),
    p.experience_level
  from public.profiles p
  where p.id = p_profile_id
    and coalesce(p.public_profile, true) = true
    and p.role in ('client', 'professional', 'admin');
$$;

revoke all on function public.get_public_credential(uuid) from public;
grant execute on function public.get_public_credential(uuid) to anon, authenticated;
