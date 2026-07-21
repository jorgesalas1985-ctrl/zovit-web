-- ZOVIT: corrige "permission denied for table profiles" (42501)
-- Ejecutar en Supabase > SQL Editor > New query > Run
-- Las políticas RLS no aplican si el rol authenticated no tiene GRANT a nivel de tabla.

grant usage on schema public to anon, authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.solicitudes_de_servicio to authenticated;
grant select, insert on public.request_messages to authenticated;
grant select, insert on public.request_photos to authenticated;
grant select on public.request_status_history to authenticated;
grant select, update on public.notifications to authenticated;

grant select on public.profiles to anon;
grant select on public.solicitudes_de_servicio to anon;
