-- Ejecutar YA en Supabase SQL Editor.
-- Corrige: permission denied for table service_proposals / payments / work_orders

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update on public.service_proposals to authenticated, service_role;
grant select, insert, update on public.work_orders to authenticated, service_role;
grant select, insert, update on public.payments to authenticated, service_role;
grant select, insert on public.payment_events to authenticated, service_role;
grant select, insert, update on public.wallets to authenticated, service_role;
grant select, insert on public.wallet_transactions to authenticated, service_role;
grant select, insert, update on public.payment_disputes to authenticated, service_role;

grant execute on function public.create_service_proposal(uuid, numeric, text, numeric) to authenticated;
grant execute on function public.accept_service_proposal(uuid) to authenticated;
grant execute on function public.register_payment_received(uuid, text, text, text, text) to authenticated, service_role;
grant execute on function public.start_paid_work(uuid) to authenticated;
grant execute on function public.complete_paid_work(uuid) to authenticated;
grant execute on function public.approve_and_release_payment(uuid) to authenticated;
grant execute on function public.calculate_payment_breakdown(numeric) to authenticated;
grant execute on function public.get_wallet_summary(uuid) to authenticated;
