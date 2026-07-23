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

grant execute on function public.is_request_participant(uuid, uuid) to authenticated;
grant execute on function public.accept_service_request(uuid) to authenticated;
grant execute on function public.change_service_request_status(uuid, text) to authenticated;
grant execute on function public.search_professionals(text, text, text, int) to anon, authenticated;
grant execute on function public.create_service_proposal(uuid, numeric, text, numeric) to authenticated;
grant execute on function public.accept_service_proposal(uuid) to authenticated;
grant execute on function public.register_payment_received(uuid, text, text, text, text) to authenticated;
grant execute on function public.start_paid_work(uuid) to authenticated;
grant execute on function public.complete_paid_work(uuid) to authenticated;
grant execute on function public.approve_and_release_payment(uuid) to authenticated;
grant execute on function public.get_wallet_summary(uuid) to authenticated;
