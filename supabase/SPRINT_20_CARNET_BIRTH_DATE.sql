-- SPRINT 20: fecha de nacimiento corroborada con carnet de identidad

alter table public.profiles
  add column if not exists birth_date date;

alter table public.profiles
  add column if not exists birth_date_carnet_confirmed boolean not null default false;

alter table public.profiles
  add column if not exists birth_date_admin_corroborated boolean not null default false;

alter table public.profiles
  add column if not exists birth_date_admin_corroborated_at timestamptz;

alter table public.profiles
  add column if not exists birth_date_admin_corroborated_by uuid references public.profiles(id);

comment on column public.profiles.birth_date_carnet_confirmed is
  'Usuario declaró que birth_date coincide con la impresa en su carnet.';

comment on column public.profiles.birth_date_admin_corroborated is
  'Revisor confirmó que birth_date coincide con la imagen del carnet.';

create or replace function public.submit_identity_verification()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status text;
  caller_rut text;
  caller_birth date;
  caller_birth_confirmed boolean;
  uploaded_count int;
begin
  if auth.uid() is null then
    raise exception 'Sesión no válida';
  end if;

  select identity_status, rut, birth_date, coalesce(birth_date_carnet_confirmed, false)
    into current_status, caller_rut, caller_birth, caller_birth_confirmed
  from public.profiles
  where id = auth.uid();

  if current_status = 'pending' then
    raise exception 'Tu verificación ya está en revisión';
  end if;

  if current_status = 'approved' then
    raise exception 'Tu identidad ya está verificada';
  end if;

  if caller_rut is null or btrim(caller_rut) = '' then
    raise exception 'Completa tu RUT antes de enviar la verificación biométrica';
  end if;

  if caller_birth is null then
    raise exception 'Ingresa la fecha de nacimiento de tu carnet antes de enviar la verificación';
  end if;

  if caller_birth > (current_date - interval '18 years') then
    raise exception 'Debes ser mayor de 18 años para registrarte en ZOVIT (Chile).';
  end if;

  if caller_birth_confirmed is not true then
    raise exception 'Debes confirmar que la fecha de nacimiento coincide con tu carnet de identidad';
  end if;

  select count(*) into uploaded_count
  from public.identity_documents
  where profile_id = auth.uid()
    and status in ('uploaded', 'approved')
    and document_type in ('cedula_front', 'cedula_back', 'selfie', 'liveness_proof');

  if uploaded_count < 4 then
    raise exception 'Debes completar carnet y verificación biométrica antes de enviar';
  end if;

  update public.profiles
  set
    identity_status = 'pending',
    identity_submitted_at = now(),
    identity_rejection_reason = null,
    updated_at = now()
  where id = auth.uid();
end;
$$;

-- Revisión admin: al aprobar, exigir corroboración de fecha vs carnet
drop function if exists public.review_identity_verification(uuid, text, text);

create or replace function public.review_identity_verification(
  target_profile_id uuid,
  review_action text,
  rejection_reason text default null,
  carnet_birth_matches boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  now_ts timestamptz := now();
  declared_birth date;
begin
  if not public.is_platform_admin() then
    raise exception 'Acceso restringido';
  end if;

  if review_action = 'approve' then
    if coalesce(carnet_birth_matches, false) is not true then
      raise exception
        'Debes corroborar que la fecha de nacimiento coincide con el carnet antes de aprobar.';
    end if;

    select birth_date into declared_birth
    from public.profiles
    where id = target_profile_id;

    if declared_birth is null then
      raise exception 'El usuario no tiene fecha de nacimiento declarada desde el carnet.';
    end if;

    if declared_birth > (current_date - interval '18 years') then
      raise exception 'No se puede aprobar: la fecha declara menor de 18 años.';
    end if;

    update public.profiles
    set
      identity_status = 'approved',
      identity_verified = true,
      biometric_verified = true,
      identity_verified_at = now_ts,
      identity_rejection_reason = null,
      birth_date_admin_corroborated = true,
      birth_date_admin_corroborated_at = now_ts,
      birth_date_admin_corroborated_by = auth.uid(),
      updated_at = now_ts
    where id = target_profile_id
      and identity_status = 'pending';

    update public.identity_documents
    set
      status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now_ts,
      updated_at = now_ts
    where profile_id = target_profile_id;

    return;
  end if;

  if review_action = 'reject' then
    update public.profiles
    set
      identity_status = 'rejected',
      identity_verified = false,
      biometric_verified = false,
      identity_verified_at = null,
      identity_rejection_reason = coalesce(nullif(btrim(rejection_reason), ''), 'Documentos no válidos.'),
      birth_date_admin_corroborated = false,
      birth_date_admin_corroborated_at = null,
      birth_date_admin_corroborated_by = null,
      updated_at = now_ts
    where id = target_profile_id
      and identity_status = 'pending';

    update public.identity_documents
    set
      status = 'rejected',
      admin_notes = coalesce(nullif(btrim(rejection_reason), ''), admin_notes),
      reviewed_by = auth.uid(),
      reviewed_at = now_ts,
      updated_at = now_ts
    where profile_id = target_profile_id;

    return;
  end if;

  raise exception 'Acción inválida';
end;
$$;

grant execute on function public.review_identity_verification(uuid, text, text, boolean) to authenticated;
