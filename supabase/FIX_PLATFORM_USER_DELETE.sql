-- ZOVIT: permite eliminar usuarios de plataforma sin violar FKs residuales
-- Ejecutar en Supabase SQL Editor si la eliminación sigue fallando por restricciones.

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
