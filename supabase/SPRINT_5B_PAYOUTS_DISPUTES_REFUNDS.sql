-- Sprint 5B: disputas, reembolsos ledger + retiros (payouts) al profesional.
-- Fase A: dinero real sigue en cuenta MP de ZOVIT; wallet = libro contable.
-- Fase B (Marketplace MP) se documenta aparte; esta migración no la requiere.

-- ─── Retiros (payouts) ────────────────────────────────────────────────────────

create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'CLP',
  status text not null default 'pendiente'
    check (status in ('pendiente', 'aprobado', 'pagado', 'rechazado', 'cancelado')),
  bank_name text not null,
  bank_account_type text not null check (bank_account_type in ('cuenta_corriente', 'cuenta_vista', 'cuenta_rut')),
  bank_account_number text not null,
  account_holder_name text not null,
  account_holder_rut text not null,
  admin_note text,
  processed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists payout_requests_user_idx
  on public.payout_requests(user_id, created_at desc);
create index if not exists payout_requests_status_idx
  on public.payout_requests(status, created_at desc);

alter table public.payout_requests enable row level security;

drop policy if exists "payouts_select_own_or_super" on public.payout_requests;
create policy "payouts_select_own_or_super" on public.payout_requests
  for select to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.intranet_role = 'super_admin'
    )
  );

grant select, insert, update on public.payout_requests to authenticated, service_role;

-- Preparación Fase B: vínculo seller Mercado Pago (sin OAuth aún).
alter table public.profiles
  add column if not exists mp_collector_id text,
  add column if not exists mp_oauth_connected_at timestamptz;

-- ─── Abrir disputa ─────────────────────────────────────────────────────────────

create or replace function public.open_payment_dispute(p_payment_id uuid, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_row public.payments%rowtype;
  dispute_id uuid;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if length(v_reason) < 10 then raise exception 'Describe el motivo con al menos 10 caracteres'; end if;

  select * into payment_row from public.payments where id = p_payment_id for update;
  if not found then raise exception 'Pago no encontrado'; end if;

  if payment_row.client_id <> auth.uid() and payment_row.professional_id <> auth.uid() then
    raise exception 'Sin permiso para abrir disputa';
  end if;

  if payment_row.status not in (
    'pago_retenido', 'trabajo_en_ejecucion', 'esperando_aprobacion_cliente', 'en_disputa'
  ) then
    raise exception 'Este pago no admite disputa en estado %', payment_row.status;
  end if;

  if exists (
    select 1 from public.payment_disputes d
    where d.payment_id = p_payment_id and d.status in ('abierta', 'en_revision')
  ) then
    raise exception 'Ya existe una disputa abierta para este pago';
  end if;

  insert into public.payment_disputes (payment_id, opened_by, reason, status)
  values (p_payment_id, auth.uid(), v_reason, 'abierta')
  returning id into dispute_id;

  update public.payments
  set status = 'en_disputa', updated_at = now()
  where id = p_payment_id;

  perform public.log_payment_event(
    p_payment_id, 'disputa_abierta', payment_row.status, 'en_disputa',
    payment_row.amount_gross, payment_row.platform_fee, payment_row.tax_amount,
    payment_row.payment_method, auth.uid(),
    jsonb_build_object('dispute_id', dispute_id, 'reason', v_reason)
  );

  return dispute_id;
end;
$$;

-- ─── Reembolso ledger (tras refund MP o mock) ─────────────────────────────────

create or replace function public.refund_held_payment(
  p_payment_id uuid,
  p_actor_id uuid default null,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_row public.payments%rowtype;
  wallet_id uuid;
  actor uuid := coalesce(p_actor_id, auth.uid());
begin
  select * into payment_row from public.payments where id = p_payment_id for update;
  if not found then raise exception 'Pago no encontrado'; end if;

  if payment_row.status not in (
    'pago_retenido', 'trabajo_en_ejecucion', 'esperando_aprobacion_cliente', 'en_disputa'
  ) then
    raise exception 'No se puede reembolsar un pago en estado %', payment_row.status;
  end if;

  wallet_id := public.ensure_wallet(payment_row.professional_id);

  if (select held_balance from public.wallets where id = wallet_id) < payment_row.amount_net then
    raise exception 'Saldo retenido insuficiente para reembolsar';
  end if;

  update public.payments
  set status = 'reembolsado', updated_at = now()
  where id = p_payment_id;

  update public.wallets
  set held_balance = held_balance - payment_row.amount_net,
      updated_at = now()
  where id = wallet_id;

  insert into public.wallet_transactions (
    wallet_id, user_id, payment_id, transaction_type, amount,
    balance_after_available, balance_after_held, description, reference_id
  )
  select
    wallet_id, payment_row.professional_id, p_payment_id, 'reembolso', payment_row.amount_net,
    w.available_balance, w.held_balance,
    coalesce(nullif(trim(p_note), ''), 'Reembolso al cliente — retención liberada del escrow'),
    payment_row.public_id
  from public.wallets w where w.id = wallet_id;

  update public.payment_disputes
  set status = 'resuelta_reembolso',
      resolution_note = coalesce(nullif(trim(p_note), ''), resolution_note),
      resolved_at = now()
  where payment_id = p_payment_id
    and status in ('abierta', 'en_revision');

  perform public.log_payment_event(
    p_payment_id, 'reembolso', payment_row.status, 'reembolsado',
    payment_row.amount_gross, payment_row.platform_fee, payment_row.tax_amount,
    payment_row.payment_method, actor,
    jsonb_build_object('note', p_note)
  );

  insert into public.notifications(user_id, request_id, title, body)
  values
    (payment_row.client_id, payment_row.request_id, 'Reembolso procesado',
     'Tu pago fue reembolsado. El dinero vuelve según los plazos de Mercado Pago.'),
    (payment_row.professional_id, payment_row.request_id, 'Pago reembolsado',
     'Una disputa o decisión administrativa reembolsó el pago retenido.');
end;
$$;

-- ─── Resolver disputa liberando al pro (sin reembolso) ────────────────────────

create or replace function public.resolve_dispute_release(
  p_dispute_id uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  dispute_row public.payment_disputes%rowtype;
  payment_row public.payments%rowtype;
  wallet_id uuid;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.intranet_role = 'super_admin'
  ) then
    raise exception 'Solo el super administrador puede resolver disputas';
  end if;

  select * into dispute_row from public.payment_disputes where id = p_dispute_id for update;
  if not found then raise exception 'Disputa no encontrada'; end if;
  if dispute_row.status not in ('abierta', 'en_revision') then
    raise exception 'La disputa ya está resuelta';
  end if;

  select * into payment_row from public.payments where id = dispute_row.payment_id for update;
  if payment_row.status <> 'en_disputa' then
    raise exception 'El pago no está en disputa';
  end if;

  wallet_id := public.ensure_wallet(payment_row.professional_id);

  update public.payments
  set status = 'pago_liberado', released_at = now(), updated_at = now()
  where id = payment_row.id;

  update public.wallets
  set held_balance = held_balance - payment_row.amount_net,
      available_balance = available_balance + payment_row.amount_net,
      updated_at = now()
  where id = wallet_id;

  insert into public.wallet_transactions (
    wallet_id, user_id, payment_id, transaction_type, amount,
    balance_after_available, balance_after_held, description, reference_id
  )
  select
    wallet_id, payment_row.professional_id, payment_row.id, 'liberacion', payment_row.amount_net,
    w.available_balance, w.held_balance,
    'Pago liberado tras resolución de disputa a favor del profesional',
    payment_row.public_id
  from public.wallets w where w.id = wallet_id;

  update public.payment_disputes
  set status = 'resuelta_liberacion',
      resolution_note = coalesce(nullif(trim(p_note), ''), 'Liberado al profesional'),
      resolved_at = now()
  where id = p_dispute_id;

  perform public.log_payment_event(
    payment_row.id, 'disputa_resuelta_liberacion', 'en_disputa', 'pago_liberado',
    payment_row.amount_gross, payment_row.platform_fee, payment_row.tax_amount,
    payment_row.payment_method, auth.uid(),
    jsonb_build_object('dispute_id', p_dispute_id, 'note', p_note)
  );
end;
$$;

-- ─── Solicitar retiro ─────────────────────────────────────────────────────────

create or replace function public.request_payout(
  p_amount numeric,
  p_bank_name text,
  p_bank_account_type text,
  p_bank_account_number text,
  p_account_holder_name text,
  p_account_holder_rut text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  wallet_id uuid;
  payout_id uuid;
  v_available numeric;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if p_amount is null or p_amount < 1000 then
    raise exception 'El monto mínimo de retiro es $1.000 CLP';
  end if;
  if trim(coalesce(p_bank_name, '')) = ''
     or trim(coalesce(p_bank_account_number, '')) = ''
     or trim(coalesce(p_account_holder_name, '')) = ''
     or trim(coalesce(p_account_holder_rut, '')) = '' then
    raise exception 'Completa los datos bancarios';
  end if;
  if p_bank_account_type not in ('cuenta_corriente', 'cuenta_vista', 'cuenta_rut') then
    raise exception 'Tipo de cuenta inválido';
  end if;

  wallet_id := public.ensure_wallet(auth.uid());
  select available_balance into v_available from public.wallets where id = wallet_id for update;

  if v_available < p_amount then
    raise exception 'Saldo disponible insuficiente';
  end if;

  update public.wallets
  set available_balance = available_balance - p_amount,
      updated_at = now()
  where id = wallet_id;

  insert into public.payout_requests (
    user_id, amount, bank_name, bank_account_type, bank_account_number,
    account_holder_name, account_holder_rut, status
  ) values (
    auth.uid(), p_amount, trim(p_bank_name), p_bank_account_type,
    trim(p_bank_account_number), trim(p_account_holder_name), trim(p_account_holder_rut),
    'pendiente'
  ) returning id into payout_id;

  insert into public.wallet_transactions (
    wallet_id, user_id, payment_id, transaction_type, amount,
    balance_after_available, balance_after_held, description, reference_id
  )
  select
    wallet_id, auth.uid(), null, 'retiro', p_amount,
    w.available_balance, w.held_balance,
    'Solicitud de retiro pendiente de transferencia',
    payout_id::text
  from public.wallets w where w.id = wallet_id;

  return payout_id;
end;
$$;

-- ─── Aprobar / rechazar retiro (super admin) ──────────────────────────────────

create or replace function public.process_payout(
  p_payout_id uuid,
  p_action text,
  p_admin_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  payout_row public.payout_requests%rowtype;
  wallet_id uuid;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.intranet_role = 'super_admin'
  ) then
    raise exception 'Solo el super administrador puede procesar retiros';
  end if;

  if p_action not in ('aprobar', 'pagar', 'rechazar') then
    raise exception 'Acción inválida';
  end if;

  select * into payout_row from public.payout_requests where id = p_payout_id for update;
  if not found then raise exception 'Retiro no encontrado'; end if;

  if p_action = 'aprobar' then
    if payout_row.status <> 'pendiente' then raise exception 'Solo retiros pendientes se aprueban'; end if;
    update public.payout_requests
    set status = 'aprobado',
        admin_note = coalesce(p_admin_note, admin_note),
        processed_by = auth.uid()
    where id = p_payout_id;
  elsif p_action = 'pagar' then
    if payout_row.status not in ('pendiente', 'aprobado') then
      raise exception 'Solo retiros pendientes/aprobados se marcan como pagados';
    end if;
    update public.payout_requests
    set status = 'pagado',
        admin_note = coalesce(p_admin_note, admin_note),
        processed_by = auth.uid(),
        processed_at = now()
    where id = p_payout_id;
  elsif p_action = 'rechazar' then
    if payout_row.status not in ('pendiente', 'aprobado') then
      raise exception 'Solo retiros pendientes/aprobados se rechazan';
    end if;
    wallet_id := public.ensure_wallet(payout_row.user_id);
    update public.wallets
    set available_balance = available_balance + payout_row.amount,
        updated_at = now()
    where id = wallet_id;
    insert into public.wallet_transactions (
      wallet_id, user_id, payment_id, transaction_type, amount,
      balance_after_available, balance_after_held, description, reference_id
    )
    select
      wallet_id, payout_row.user_id, null, 'ingreso', payout_row.amount,
      w.available_balance, w.held_balance,
      coalesce(nullif(trim(p_admin_note), ''), 'Retiro rechazado — saldo devuelto'),
      p_payout_id::text
    from public.wallets w where w.id = wallet_id;

    update public.payout_requests
    set status = 'rechazado',
        admin_note = coalesce(p_admin_note, admin_note),
        processed_by = auth.uid(),
        processed_at = now()
    where id = p_payout_id;
  end if;
end;
$$;

grant execute on function public.open_payment_dispute(uuid, text) to authenticated;
grant execute on function public.refund_held_payment(uuid, uuid, text) to service_role;
grant execute on function public.resolve_dispute_release(uuid, text) to authenticated;
grant execute on function public.request_payout(numeric, text, text, text, text, text) to authenticated;
grant execute on function public.process_payout(uuid, text, text) to authenticated;
