-- Sprint 24: el super administrador no puede ser rechazado en verificación de identidad.

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
  target_intranet text;
begin
  if not public.is_platform_admin() then
    raise exception 'Acceso restringido';
  end if;

  select intranet_role into target_intranet
  from public.profiles
  where id = target_profile_id;

  if review_action = 'reject' and target_intranet = 'super_admin' then
    raise exception 'No se puede rechazar la verificación del super administrador.';
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
