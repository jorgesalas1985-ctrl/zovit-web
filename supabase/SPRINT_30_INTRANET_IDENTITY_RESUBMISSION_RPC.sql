-- Sprint 30: reenvío documental de identidad, atómico y autorizado por sesión.
-- Esta función debe invocarse con el cliente autenticado del actor para que
-- auth.uid() represente al revisor real. No se debe llamar con service_role.

create or replace function public.intranet_request_identity_resubmission(
  p_profile_id uuid,
  p_document_ids uuid[],
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_intranet_role text;
  target_identity_status text;
  requested_document_count integer;
  owned_document_count integer;
  updated_document_count integer;
  updated_profile_count integer;
  now_ts timestamptz := now();
  explanation text;
  request_message text;
  document_labels text;
begin
  if actor_id is null then
    raise exception 'Acceso no autorizado';
  end if;

  select intranet_role
    into actor_intranet_role
  from public.profiles
  where id = actor_id;

  if coalesce(actor_intranet_role, '') not in ('hr_admin', 'super_admin') then
    raise exception 'Acceso no autorizado';
  end if;

  if p_document_ids is null or cardinality(p_document_ids) = 0 then
    raise exception 'Selecciona al menos un documento';
  end if;

  select count(*)
    into requested_document_count
  from unnest(p_document_ids) as requested_document(id);

  if requested_document_count <> cardinality(p_document_ids) then
    raise exception 'Los documentos solicitados no son válidos';
  end if;

  if (select count(distinct id) from unnest(p_document_ids) as requested_document(id))
      <> requested_document_count then
    raise exception 'Los documentos solicitados no son válidos';
  end if;

  select identity_status
    into target_identity_status
  from public.profiles
  where id = p_profile_id
  for update;

  if not found then
    raise exception 'Perfil no encontrado';
  end if;

  if target_identity_status <> 'pending' then
    raise exception 'La identidad ya no está pendiente de revisión';
  end if;

  select count(*)
    into owned_document_count
  from (
    select id
    from public.identity_documents
    where profile_id = p_profile_id
      and id = any(p_document_ids)
    for update
  ) as locked_documents;

  if owned_document_count <> requested_document_count then
    raise exception 'Uno o más documentos no pertenecen a esta identidad';
  end if;

  select string_agg(
    case document_type
      when 'cedula_front' then 'anverso de cédula'
      when 'cedula_back' then 'reverso de cédula'
      when 'selfie' then 'selfie'
      when 'liveness_proof' then 'prueba de vida'
      else 'documento'
    end,
    ', '
    order by id
  )
    into document_labels
  from public.identity_documents
  where profile_id = p_profile_id
    and id = any(p_document_ids);

  explanation := coalesce(nullif(btrim(p_reason), ''), 'Los archivos no permiten validar la información con claridad.');
  request_message := format('Debes reenviar: %s. Motivo: %s', document_labels, explanation);

  update public.identity_documents
  set
    status = 'rejected',
    reviewed_by = actor_id,
    reviewed_at = now_ts,
    admin_notes = request_message,
    updated_at = now_ts
  where profile_id = p_profile_id
    and id = any(p_document_ids);
  get diagnostics updated_document_count = row_count;

  if updated_document_count <> requested_document_count then
    raise exception 'No se pudieron actualizar todos los documentos solicitados';
  end if;

  update public.profiles
  set
    identity_status = 'rejected',
    identity_verified = false,
    biometric_verified = false,
    identity_verified_at = null,
    identity_rejection_reason = request_message,
    identity_resubmission_due_at = now_ts + interval '30 days',
    identity_resubmission_suspended_at = null,
    identity_ai_status = 'pending',
    identity_ai_summary = 'Pendiente de reenvío documental solicitado por revisión humana.',
    updated_at = now_ts
  where id = p_profile_id
    and identity_status = 'pending';
  get diagnostics updated_profile_count = row_count;

  if updated_profile_count <> 1 then
    raise exception 'La identidad ya no está pendiente de revisión';
  end if;

  insert into public.notifications (user_id, title, body)
  values (
    p_profile_id,
    'Debes reenviar documentos',
    format('%s Ingresa a Panel → Verificación para reemplazarlos y enviar nuevamente tu revisión.', request_message)
  );
end;
$$;

revoke all on function public.intranet_request_identity_resubmission(uuid, uuid[], text) from public;
grant execute on function public.intranet_request_identity_resubmission(uuid, uuid[], text) to authenticated;
