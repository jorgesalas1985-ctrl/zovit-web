-- Sprint 8: Verificación biométrica (carnet + selfie + prueba de vida)

alter table public.identity_documents
  add column if not exists metadata jsonb;

alter table public.profiles
  add column if not exists biometric_verified boolean not null default false;

alter table public.identity_documents
  drop constraint if exists identity_documents_document_type_check;

alter table public.identity_documents
  add constraint identity_documents_document_type_check
  check (
    document_type in (
      'cedula_front',
      'cedula_back',
      'certificado_antecedentes',
      'selfie',
      'liveness_proof'
    )
  );

update storage.buckets
set
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/webm'],
  file_size_limit = 15728640
where id = 'identity-documents';

create or replace function public.submit_identity_verification()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  required_count int;
  uploaded_count int;
  current_status text;
  caller_rut text;
begin
  if auth.uid() is null then
    raise exception 'Sesión no válida';
  end if;

  select role, identity_status, rut
    into caller_role, current_status, caller_rut
  from public.profiles
  where id = auth.uid();

  if current_status = 'pending' then
    raise exception 'Tu verificación ya está en revisión';
  end if;

  if current_status = 'approved' then
    raise exception 'Tu identidad ya está verificada';
  end if;

  if caller_rut is null or btrim(caller_rut) = '' then
    raise exception 'Completa tu RUT en Mi perfil antes de enviar la verificación';
  end if;

  if caller_role in ('professional', 'admin') then
    required_count := 5;
  else
    required_count := 4;
  end if;

  select count(*) into uploaded_count
  from public.identity_documents
  where profile_id = auth.uid()
    and status in ('uploaded', 'approved')
    and document_type in (
      'cedula_front',
      'cedula_back',
      'selfie',
      'liveness_proof',
      'certificado_antecedentes'
    )
    and (
      document_type in ('cedula_front', 'cedula_back', 'selfie', 'liveness_proof')
      or caller_role in ('professional', 'admin')
    );

  if uploaded_count < required_count then
    raise exception 'Debes completar carnet, biometría y documentos requeridos antes de enviar';
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

create or replace function public.review_identity_verification(
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
      identity_status = 'approved',
      identity_verified = true,
      biometric_verified = true,
      identity_verified_at = now_ts,
      identity_rejection_reason = null,
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

grant execute on function public.review_identity_verification(uuid, text, text) to authenticated;
