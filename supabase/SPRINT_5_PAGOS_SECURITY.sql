-- Phase 0: Payment security hardening
-- Run after SPRINT_5_PAGOS.sql

-- Unique provider reference per payment gateway (ignore nulls)
create unique index if not exists payments_provider_reference_unique_idx
  on public.payments (provider_reference)
  where provider_reference is not null;

-- ─── Harden register_payment_received ─────────────────────────────────────────

create or replace function public.register_payment_received(
  p_payment_id uuid,
  p_provider text,
  p_provider_reference text,
  p_provider_session_id text default null,
  p_payment_method text default null,
  p_external_reference text default null,
  p_amount_gross numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_row public.payments%rowtype;
  wallet_id uuid;
begin
  select * into payment_row from public.payments where id = p_payment_id for update;
  if not found then raise exception 'Pago no encontrado'; end if;

  if payment_row.status not in ('esperando_pago', 'pendiente') then
    raise exception 'El pago no puede recibirse en estado %', payment_row.status;
  end if;

  if p_external_reference is not null and p_external_reference <> payment_row.public_id then
    raise exception 'external_reference no coincide con el pago ZOVIT';
  end if;

  if p_amount_gross is not null and p_amount_gross <> payment_row.amount_gross then
    raise exception 'El monto no coincide con amount_gross';
  end if;

  if p_provider_reference is not null and exists (
    select 1 from public.payments p
    where p.provider_reference = p_provider_reference
      and p.id <> p_payment_id
  ) then
    raise exception 'provider_reference ya registrado';
  end if;

  wallet_id := public.ensure_wallet(payment_row.professional_id);

  update public.payments
  set status = 'pago_retenido',
      provider = p_provider,
      provider_reference = p_provider_reference,
      provider_session_id = p_provider_session_id,
      payment_method = coalesce(p_payment_method, p_provider),
      paid_at = now(),
      updated_at = now()
  where id = p_payment_id;

  update public.wallets
  set held_balance = held_balance + payment_row.amount_net,
      updated_at = now()
  where id = wallet_id;

  insert into public.wallet_transactions (
    wallet_id, user_id, payment_id, transaction_type, amount,
    balance_after_available, balance_after_held, description, reference_id
  )
  select
    wallet_id, payment_row.professional_id, p_payment_id, 'retencion', payment_row.amount_net,
    w.available_balance, w.held_balance,
    'Pago retenido por ZOVIT hasta completar el trabajo',
    payment_row.public_id
  from public.wallets w where w.id = wallet_id;

  perform public.log_payment_event(
    p_payment_id, 'pago_recibido', payment_row.status, 'pago_retenido',
    payment_row.amount_gross, payment_row.platform_fee, payment_row.tax_amount,
    coalesce(p_payment_method, p_provider), payment_row.client_id,
    jsonb_build_object('provider_reference', p_provider_reference)
  );

  update public.solicitudes_de_servicio
  set status = 'aceptada', updated_at = now()
  where id = payment_row.request_id;
end;
$$;

-- Only service_role may confirm payments (webhooks / server sync)
revoke execute on function public.register_payment_received(uuid, text, text, text, text) from authenticated;
revoke execute on function public.register_payment_received(uuid, text, text, text, text, text, numeric) from authenticated;
revoke execute on function public.register_payment_received(uuid, text, text, text, text, text, numeric) from anon;
revoke execute on function public.register_payment_received(uuid, text, text, text, text, text, numeric) from public;

grant execute on function public.register_payment_received(uuid, text, text, text, text, text, numeric) to service_role;
