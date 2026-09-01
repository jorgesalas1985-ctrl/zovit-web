-- Sprint 32: revisión de identidad atómica para revisores de intranet.
-- Invocar con cliente autenticado: auth.uid() identifica al revisor real.

create or replace function public.intranet_review_identity_verification(
  p_profile_id uuid,
  p_action text,
  p_reason text default null,
  p_carnet_birth_matches boolean default false,
  p_biometric_face_matches boolean default false
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
  target_intranet_role text;
  now_ts timestamptz := now();
  rejection_reason text;
  updated_profile_count integer;
begin
  if actor_id is null then
    raise exception 'Acceso no autorizado';
  end if;

  select intranet_role into actor_intranet_role from public.profiles where id = actor_id;
  if coalesce(actor_intranet_role, '') not in ('hr_admin', 'super_admin') then
    raise exception 'Acceso no autorizado';
  end if;

  if p_action not in ('approve', 'reject') then
    raise exception 'Acción de revisión inválida';
  end if;
  if p_action = 'approve' and not p_carnet_birth_matches then
    raise exception 'Confirma que la fecha del carnet coincide antes de aprobar';
  end if;
  if p_action = 'approve' and not p_biometric_face_matches then
    raise exception 'Confirma la comparación visual entre carnet, selfie y prueba de vida antes de aprobar';
  end if;

  rejection_reason := nullif(btrim(p_reason), '');
  if p_action = 'reject' and rejection_reason is null then
    raise exception 'Indica un motivo de rechazo';
  end if;

  select identity_status, intranet_role
    into target_identity_status, target_intranet_role
  from public.profiles
  where id = p_profile_id
  for update;
  if not found or target_identity_status <> 'pending' then
    raise exception 'Esta identidad ya fue aprobada, rechazada o no está pendiente de revisión';
  end if;
  if p_action = 'reject' and target_intranet_role = 'super_admin' then
    raise exception 'No se puede rechazar la verificación del super administrador';
  end if;

  update public.profiles
  set
    identity_status = case when p_action = 'approve' then 'approved' else 'rejected' end,
    identity_verified = p_action = 'approve',
    biometric_verified = p_action = 'approve',
    identity_verified_at = case when p_action = 'approve' then now_ts else null end,
    identity_rejection_reason = case when p_action = 'approve' then null else rejection_reason end,
    birth_date_admin_corroborated = p_action = 'approve',
    birth_date_admin_corroborated_at = case when p_action = 'approve' then now_ts else null end,
    birth_date_admin_corroborated_by = case when p_action = 'approve' then actor_id else null end,
    identity_ai_status = case when p_action = 'approve' then 'approved' else 'rejected' end,
    identity_ai_summary = case when p_action = 'approve'
      then 'Aprobación manual de administración: fecha del carnet y comparación visual de biometría corroboradas.'
      else rejection_reason
    end,
    identity_ai_at = now_ts,
    updated_at = now_ts
  where id = p_profile_id and identity_status = 'pending';
  get diagnostics updated_profile_count = row_count;
  if updated_profile_count <> 1 then
    raise exception 'Esta identidad ya fue aprobada, rechazada o no está pendiente de revisión';
  end if;

  update public.identity_documents
  set
    status = case when p_action = 'approve' then 'approved' else 'rejected' end,
    reviewed_by = actor_id,
    reviewed_at = now_ts,
    admin_notes = case when p_action = 'approve'
      then 'Aprobado en revisión manual; carnet, selfie y prueba de vida corroborados visualmente.'
      else rejection_reason
    end,
    updated_at = now_ts
  where profile_id = p_profile_id;
end;
$$;

revoke all on function public.intranet_review_identity_verification(uuid, text, text, boolean, boolean) from public;
grant execute on function public.intranet_review_identity_verification(uuid, text, text, boolean, boolean) to authenticated;
