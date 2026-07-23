-- Sprint 9: Biometría al registro + certificados de estudios (solo profesionales)

alter table public.profiles
  add column if not exists study_verification_status text not null default 'none'
    check (study_verification_status in ('none', 'pending', 'approved', 'rejected')),
  add column if not exists study_verified boolean not null default false,
  add column if not exists study_submitted_at timestamptz,
  add column if not exists study_rejection_reason text;

alter table public.identity_documents
  drop constraint if exists identity_documents_document_type_check;

alter table public.identity_documents
  add constraint identity_documents_document_type_check
  check (
    document_type in (
      'cedula_front',
      'cedula_back',
      'certificado_antecedentes',
      'certificado_estudios',
      'selfie',
      'liveness_proof'
    )
  );

create or replace function public.submit_identity_verification()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status text;
  caller_rut text;
  uploaded_count int;
begin
  if auth.uid() is null then
    raise exception 'Sesión no válida';
  end if;

  select identity_status, rut
    into current_status, caller_rut
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

create or replace function public.submit_study_certificate_verification()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  current_status text;
  uploaded_count int;
begin
  if auth.uid() is null then
    raise exception 'Sesión no válida';
  end if;

  select role, study_verification_status
    into caller_role, current_status
  from public.profiles
  where id = auth.uid();

  if caller_role not in ('professional', 'admin') then
    raise exception 'Solo profesionales pueden enviar certificados de estudios';
  end if;

  if current_status = 'pending' then
    raise exception 'Tu certificado ya está en revisión';
  end if;

  if current_status = 'approved' then
    raise exception 'Tus certificados de estudios ya están verificados';
  end if;

  select count(*) into uploaded_count
  from public.identity_documents
  where profile_id = auth.uid()
    and status in ('uploaded', 'approved')
    and document_type = 'certificado_estudios';

  if uploaded_count < 1 then
    raise exception 'Debes subir tu certificado de estudios antes de enviar';
  end if;

  update public.profiles
  set
    study_verification_status = 'pending',
    study_submitted_at = now(),
    study_rejection_reason = null,
    updated_at = now()
  where id = auth.uid();
end;
$$;

create or replace function public.review_study_certificate_verification(
  target_profile_id uuid,
  review_action text,
  rejection_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  now_ts timestamptz := now();
begin
  if not public.is_platform_admin() then
    raise exception 'Acceso restringido';
  end if;

  if review_action = 'approve' then
    update public.profiles
    set
      study_verification_status = 'approved',
      study_verified = true,
      study_rejection_reason = null,
      updated_at = now_ts
    where id = target_profile_id
      and study_verification_status = 'pending';

    update public.identity_documents
    set
      status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now_ts,
      updated_at = now_ts
    where profile_id = target_profile_id
      and document_type = 'certificado_estudios';

    return;
  end if;

  if review_action = 'reject' then
    update public.profiles
    set
      study_verification_status = 'rejected',
      study_verified = false,
      study_rejection_reason = coalesce(nullif(btrim(rejection_reason), ''), 'Certificado no válido.'),
      updated_at = now_ts
    where id = target_profile_id
      and study_verification_status = 'pending';

    update public.identity_documents
    set
      status = 'rejected',
      admin_notes = coalesce(nullif(btrim(rejection_reason), ''), admin_notes),
      reviewed_by = auth.uid(),
      reviewed_at = now_ts,
      updated_at = now_ts
    where profile_id = target_profile_id
      and document_type = 'certificado_estudios';

    return;
  end if;

  raise exception 'Acción inválida';
end;
$$;

grant execute on function public.submit_study_certificate_verification() to authenticated;
grant execute on function public.review_study_certificate_verification(uuid, text, text) to authenticated;
