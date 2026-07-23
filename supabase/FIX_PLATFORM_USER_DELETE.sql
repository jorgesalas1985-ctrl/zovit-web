-- ZOVIT: permite eliminar usuarios de plataforma sin violar FKs ni permisos de tabla.
-- Ejecutar en Supabase > SQL Editor > New query > Run

-- 1) FKs con ON DELETE SET NULL (limpia referencias al borrar el perfil)
alter table public.identity_documents
  drop constraint if exists identity_documents_reviewed_by_fkey;

alter table public.identity_documents
  add constraint identity_documents_reviewed_by_fkey
  foreign key (reviewed_by) references public.profiles(id) on delete set null;

alter table public.intranet_payrolls
  drop constraint if exists intranet_payrolls_created_by_fkey;

alter table public.intranet_payrolls
  add constraint intranet_payrolls_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.solicitudes_de_servicio
  drop constraint if exists solicitudes_de_servicio_professional_id_fkey;

alter table public.solicitudes_de_servicio
  add constraint solicitudes_de_servicio_professional_id_fkey
  foreign key (professional_id) references public.profiles(id) on delete set null;

alter table public.payment_events
  drop constraint if exists payment_events_actor_id_fkey;

alter table public.payment_events
  add constraint payment_events_actor_id_fkey
  foreign key (actor_id) references public.profiles(id) on delete set null;

alter table public.request_status_history
  drop constraint if exists request_status_history_changed_by_fkey;

alter table public.request_status_history
  add constraint request_status_history_changed_by_fkey
  foreign key (changed_by) references public.profiles(id) on delete set null;

-- 2) Grants para service_role (API admin de intranet)
grant select, insert, update, delete on public.identity_documents to service_role;
grant select, insert, update, delete on public.intranet_payrolls to service_role;
grant select, insert, update, delete on public.payment_events to service_role;
grant select, insert, update, delete on public.request_status_history to service_role;
grant select, insert, update, delete on public.solicitudes_de_servicio to service_role;

-- 3) RPC segura para limpiar referencias antes de borrar auth.users
create or replace function public.clear_platform_user_references(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.identity_documents
  set reviewed_by = null, updated_at = now()
  where reviewed_by = p_user_id;

  update public.intranet_payrolls
  set created_by = null
  where created_by = p_user_id;

  update public.solicitudes_de_servicio
  set professional_id = null, updated_at = now()
  where professional_id = p_user_id;

  update public.payment_events
  set actor_id = null
  where actor_id = p_user_id;

  update public.request_status_history
  set changed_by = null
  where changed_by = p_user_id;
end;
$$;

revoke all on function public.clear_platform_user_references(uuid) from public;
grant execute on function public.clear_platform_user_references(uuid) to service_role;
