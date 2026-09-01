create or replace function public.intranet_return_identity_to_review(p_profile_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare actor_id uuid := auth.uid(); actor_role text; changed integer; now_ts timestamptz := now();
begin
  if actor_id is null then raise exception 'Acceso no autorizado'; end if;
  select intranet_role into actor_role from public.profiles where id = actor_id;
  if coalesce(actor_role, '') not in ('hr_admin', 'super_admin') then raise exception 'Acceso no autorizado'; end if;
  perform 1 from public.profiles where id = p_profile_id for update;
  if not found then raise exception 'La identidad ya no está aprobada'; end if;
  update public.profiles set identity_status = 'pending', identity_verified = false, biometric_verified = false,
    identity_verified_at = null, identity_rejection_reason = null, birth_date_admin_corroborated = false,
    birth_date_admin_corroborated_at = null, birth_date_admin_corroborated_by = null, identity_ai_status = 'dudoso',
    identity_ai_summary = 'Identidad devuelta a revisión manual por administración.', identity_ai_at = now_ts, updated_at = now_ts
  where id = p_profile_id and identity_status = 'approved';
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'La identidad ya no está aprobada'; end if;
  update public.identity_documents set status = 'uploaded', reviewed_by = null, reviewed_at = null,
    admin_notes = 'Devuelto a revisión manual.', updated_at = now_ts where profile_id = p_profile_id;
end; $$;
revoke all on function public.intranet_return_identity_to_review(uuid) from public;
grant execute on function public.intranet_return_identity_to_review(uuid) to authenticated;
