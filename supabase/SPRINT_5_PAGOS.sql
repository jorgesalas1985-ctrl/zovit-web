-- ZOVIT Sprint 5: Módulo de pagos, propuestas, wallet y escrow
-- Ejecutar después de SPRINT_4_IA.sql

create extension if not exists pgcrypto;

-- ─── Propuestas ───────────────────────────────────────────────────────────────

create table if not exists public.service_proposals (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.solicitudes_de_servicio(id) on delete cascade,
  professional_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'CLP',
  description text not null,
  estimated_hours numeric(8,2),
  status text not null default 'pendiente'
    check (status in ('pendiente', 'aceptada', 'rechazada', 'retirada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_proposals_request_idx
  on public.service_proposals(request_id, created_at desc);

-- ─── Órdenes de trabajo ───────────────────────────────────────────────────────

create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.solicitudes_de_servicio(id) on delete cascade,
  proposal_id uuid not null references public.service_proposals(id) on delete restrict,
  client_id uuid not null references public.profiles(id) on delete cascade,
  professional_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'CLP',
  status text not null default 'pendiente'
    check (status in ('pendiente', 'activa', 'completada', 'cancelada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (proposal_id)
);

create index if not exists work_orders_request_idx on public.work_orders(request_id);
create index if not exists work_orders_client_idx on public.work_orders(client_id);
create index if not exists work_orders_professional_idx on public.work_orders(professional_id);

-- ─── Pagos ────────────────────────────────────────────────────────────────────

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default ('ZVT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
  work_order_id uuid not null references public.work_orders(id) on delete restrict,
  request_id uuid not null references public.solicitudes_de_servicio(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  professional_id uuid not null references public.profiles(id) on delete cascade,
  amount_gross numeric(12,2) not null check (amount_gross > 0),
  platform_fee numeric(12,2) not null default 0 check (platform_fee >= 0),
  tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
  amount_net numeric(12,2) not null check (amount_net >= 0),
  currency text not null default 'CLP',
  status text not null default 'pendiente'
    check (status in (
      'pendiente', 'esperando_pago', 'pago_recibido', 'pago_retenido',
      'trabajo_en_ejecucion', 'trabajo_finalizado', 'esperando_aprobacion_cliente',
      'pago_liberado', 'reembolsado', 'cancelado', 'en_disputa'
    )),
  provider text not null default 'mock'
    check (provider in ('mock', 'webpay', 'mercadopago', 'stripe', 'bank_transfer')),
  provider_reference text,
  provider_session_id text,
  payment_method text,
  idempotency_key text unique,
  paid_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (work_order_id)
);

create index if not exists payments_client_idx on public.payments(client_id, created_at desc);
create index if not exists payments_professional_idx on public.payments(professional_id, created_at desc);
create index if not exists payments_status_idx on public.payments(status);

-- ─── Auditoría de pagos ───────────────────────────────────────────────────────

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  event_type text not null,
  old_status text,
  new_status text,
  amount numeric(12,2),
  platform_fee numeric(12,2),
  tax_amount numeric(12,2),
  payment_method text,
  actor_id uuid references public.profiles(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists payment_events_payment_idx
  on public.payment_events(payment_id, created_at desc);

-- ─── Wallet ───────────────────────────────────────────────────────────────────

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  available_balance numeric(12,2) not null default 0 check (available_balance >= 0),
  held_balance numeric(12,2) not null default 0 check (held_balance >= 0),
  currency text not null default 'CLP',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  transaction_type text not null
    check (transaction_type in ('ingreso', 'retiro', 'retencion', 'liberacion', 'reembolso', 'comision')),
  amount numeric(12,2) not null check (amount > 0),
  balance_after_available numeric(12,2) not null,
  balance_after_held numeric(12,2) not null,
  description text not null,
  reference_id text,
  created_at timestamptz not null default now()
);

create index if not exists wallet_transactions_wallet_idx
  on public.wallet_transactions(wallet_id, created_at desc);

-- ─── Disputas ─────────────────────────────────────────────────────────────────

create table if not exists public.payment_disputes (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  opened_by uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  status text not null default 'abierta'
    check (status in ('abierta', 'en_revision', 'resuelta_reembolso', 'resuelta_liberacion')),
  resolution_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- ─── Helpers ──────────────────────────────────────────────────────────────────

create or replace function public.ensure_wallet(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  wallet_id uuid;
begin
  insert into public.wallets (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select id into wallet_id from public.wallets where user_id = p_user_id;
  return wallet_id;
end;
$$;

create or replace function public.log_payment_event(
  p_payment_id uuid,
  p_event_type text,
  p_old_status text,
  p_new_status text,
  p_amount numeric default null,
  p_platform_fee numeric default null,
  p_tax_amount numeric default null,
  p_payment_method text default null,
  p_actor_id uuid default auth.uid(),
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.payment_events (
    payment_id, event_type, old_status, new_status, amount,
    platform_fee, tax_amount, payment_method, actor_id, metadata
  ) values (
    p_payment_id, p_event_type, p_old_status, p_new_status, p_amount,
    p_platform_fee, p_tax_amount, p_payment_method, p_actor_id, p_metadata
  );
end;
$$;

create or replace function public.calculate_payment_breakdown(p_amount numeric)
returns table (
  amount_gross numeric,
  platform_fee numeric,
  tax_amount numeric,
  amount_net numeric
)
language sql
immutable
as $$
  select
    p_amount as amount_gross,
    round(p_amount * 0.10, 0) as platform_fee,
    round(p_amount * 0.10 * 0.19, 0) as tax_amount,
    round(p_amount - (p_amount * 0.10) - (p_amount * 0.10 * 0.19), 0) as amount_net;
$$;

-- ─── RPC: Crear propuesta ─────────────────────────────────────────────────────

create or replace function public.create_service_proposal(
  p_request_id uuid,
  p_amount numeric,
  p_description text,
  p_estimated_hours numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_role text;
  request_row public.solicitudes_de_servicio%rowtype;
  proposal_id uuid;
begin
  select role into profile_role from public.profiles where id = auth.uid();
  if coalesce(profile_role, '') not in ('professional', 'admin') then
    raise exception 'Solo un profesional puede enviar propuestas';
  end if;

  select * into request_row from public.solicitudes_de_servicio where id = p_request_id;
  if not found then raise exception 'Solicitud no encontrada'; end if;
  if request_row.status <> 'publicada' then
    raise exception 'La solicitud no acepta propuestas en este estado';
  end if;

  insert into public.service_proposals (
    request_id, professional_id, amount, description, estimated_hours
  ) values (
    p_request_id, auth.uid(), p_amount, trim(p_description), p_estimated_hours
  ) returning id into proposal_id;

  insert into public.notifications(user_id, request_id, title, body)
  values (
    request_row.client_id,
    p_request_id,
    'Nueva propuesta recibida',
    'Un profesional envió una propuesta para tu solicitud de ' || coalesce(request_row.category, 'servicio')
  );

  return proposal_id;
end;
$$;

-- ─── RPC: Aceptar propuesta → orden + pago ────────────────────────────────────

create or replace function public.accept_service_proposal(p_proposal_id uuid)
returns table (work_order_id uuid, payment_id uuid, payment_public_id text)
language plpgsql
security definer
set search_path = public
as $$
declare
  proposal_row public.service_proposals%rowtype;
  request_row public.solicitudes_de_servicio%rowtype;
  breakdown record;
  v_work_order_id uuid;
  v_payment_id uuid;
  v_payment_public_id text;
begin
  select * into proposal_row from public.service_proposals where id = p_proposal_id for update;
  if not found then raise exception 'Propuesta no encontrada'; end if;
  if proposal_row.status <> 'pendiente' then raise exception 'La propuesta ya fue procesada'; end if;

  select * into request_row from public.solicitudes_de_servicio where id = proposal_row.request_id for update;
  if request_row.client_id <> auth.uid()
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') then
    raise exception 'Solo el cliente puede aceptar la propuesta';
  end if;

  select * into breakdown from public.calculate_payment_breakdown(proposal_row.amount);

  update public.service_proposals
  set status = 'aceptada', updated_at = now()
  where id = p_proposal_id;

  update public.service_proposals
  set status = 'rechazada', updated_at = now()
  where request_id = proposal_row.request_id and id <> p_proposal_id and status = 'pendiente';

  insert into public.work_orders (
    request_id, proposal_id, client_id, professional_id, amount, status
  ) values (
    proposal_row.request_id, p_proposal_id, request_row.client_id,
    proposal_row.professional_id, proposal_row.amount, 'pendiente'
  ) returning id into v_work_order_id;

  insert into public.payments (
    work_order_id, request_id, client_id, professional_id,
    amount_gross, platform_fee, tax_amount, amount_net,
    status, idempotency_key
  ) values (
    v_work_order_id, proposal_row.request_id, request_row.client_id, proposal_row.professional_id,
    breakdown.amount_gross, breakdown.platform_fee, breakdown.tax_amount, breakdown.amount_net,
    'esperando_pago', 'pay-' || v_work_order_id::text
  ) returning id, public_id into v_payment_id, v_payment_public_id;

  update public.solicitudes_de_servicio
  set professional_id = proposal_row.professional_id,
      status = 'aceptada',
      updated_at = now()
  where id = proposal_row.request_id;

  update public.work_orders set status = 'activa', updated_at = now() where id = v_work_order_id;

  perform public.log_payment_event(
    v_payment_id, 'orden_creada', null, 'esperando_pago',
    breakdown.amount_gross, breakdown.platform_fee, breakdown.tax_amount, null, auth.uid()
  );

  insert into public.notifications(user_id, request_id, title, body)
  values (
    proposal_row.professional_id, proposal_row.request_id,
    'Propuesta aceptada',
    'El cliente aceptó tu propuesta. Esperando pago para iniciar el trabajo.'
  );

  return query select v_work_order_id, v_payment_id, v_payment_public_id;
end;
$$;

-- ─── RPC: Registrar pago (webhook / mock) ─────────────────────────────────────

create or replace function public.register_payment_received(
  p_payment_id uuid,
  p_provider text,
  p_provider_reference text,
  p_provider_session_id text default null,
  p_payment_method text default null
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

-- ─── RPC: Iniciar trabajo tras pago ───────────────────────────────────────────

create or replace function public.start_paid_work(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_row public.payments%rowtype;
begin
  select * into payment_row from public.payments where id = p_payment_id for update;
  if payment_row.professional_id <> auth.uid()
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') then
    raise exception 'Sin permiso';
  end if;
  if payment_row.status <> 'pago_retenido' then
    raise exception 'El pago debe estar retenido para iniciar el trabajo';
  end if;

  update public.payments set status = 'trabajo_en_ejecucion', updated_at = now() where id = p_payment_id;
  update public.solicitudes_de_servicio set status = 'en_ejecucion', updated_at = now() where id = payment_row.request_id;

  perform public.log_payment_event(
    p_payment_id, 'trabajo_iniciado', 'pago_retenido', 'trabajo_en_ejecucion',
    payment_row.amount_gross, payment_row.platform_fee, payment_row.tax_amount,
    payment_row.payment_method, auth.uid()
  );
end;
$$;

-- ─── RPC: Profesional marca trabajo finalizado ────────────────────────────────

create or replace function public.complete_paid_work(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_row public.payments%rowtype;
begin
  select * into payment_row from public.payments where id = p_payment_id for update;
  if payment_row.professional_id <> auth.uid()
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') then
    raise exception 'Sin permiso';
  end if;
  if payment_row.status <> 'trabajo_en_ejecucion' then
    raise exception 'El trabajo debe estar en ejecución';
  end if;

  update public.payments
  set status = 'esperando_aprobacion_cliente', updated_at = now()
  where id = p_payment_id;

  update public.solicitudes_de_servicio set status = 'finalizada', updated_at = now() where id = payment_row.request_id;
  update public.work_orders set status = 'completada', updated_at = now() where id = payment_row.work_order_id;

  perform public.log_payment_event(
    p_payment_id, 'trabajo_finalizado', 'trabajo_en_ejecucion', 'esperando_aprobacion_cliente',
    payment_row.amount_gross, payment_row.platform_fee, payment_row.tax_amount,
    payment_row.payment_method, auth.uid()
  );

  insert into public.notifications(user_id, request_id, title, body)
  values (
    payment_row.client_id, payment_row.request_id,
    'Confirma tu servicio',
    'El profesional marcó el trabajo como finalizado. Confirma para liberar el pago.'
  );
end;
$$;

-- ─── RPC: Cliente aprueba y libera pago ───────────────────────────────────────

create or replace function public.approve_and_release_payment(p_payment_id uuid)
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
  if payment_row.client_id <> auth.uid()
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') then
    raise exception 'Solo el cliente puede aprobar el trabajo';
  end if;
  if payment_row.status <> 'esperando_aprobacion_cliente' then
    raise exception 'El pago no está esperando aprobación';
  end if;

  wallet_id := public.ensure_wallet(payment_row.professional_id);

  update public.payments
  set status = 'pago_liberado', released_at = now(), updated_at = now()
  where id = p_payment_id;

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
    wallet_id, payment_row.professional_id, p_payment_id, 'liberacion', payment_row.amount_net,
    w.available_balance, w.held_balance,
    'Pago liberado al profesional tras aprobación del cliente',
    payment_row.public_id
  from public.wallets w where w.id = wallet_id;

  insert into public.wallet_transactions (
    wallet_id, user_id, payment_id, transaction_type, amount,
    balance_after_available, balance_after_held, description, reference_id
  )
  select
    wallet_id, payment_row.professional_id, p_payment_id, 'comision', payment_row.platform_fee + payment_row.tax_amount,
    w.available_balance, w.held_balance,
    'Comisión ZOVIT descontada',
    payment_row.public_id
  from public.wallets w where w.id = wallet_id;

  perform public.log_payment_event(
    p_payment_id, 'pago_liberado', 'esperando_aprobacion_cliente', 'pago_liberado',
    payment_row.amount_gross, payment_row.platform_fee, payment_row.tax_amount,
    payment_row.payment_method, auth.uid()
  );

  insert into public.notifications(user_id, request_id, title, body)
  values (
    payment_row.professional_id, payment_row.request_id,
    'Pago liberado',
    'El cliente confirmó el trabajo. El pago fue liberado a tu wallet ZOVIT.'
  );
end;
$$;

-- ─── RPC: Dashboards ──────────────────────────────────────────────────────────

create or replace function public.get_wallet_summary(p_user_id uuid default auth.uid())
returns table (
  available_balance numeric,
  held_balance numeric,
  currency text,
  total_received numeric,
  total_fees numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(w.available_balance, 0),
    coalesce(w.held_balance, 0),
    coalesce(w.currency, 'CLP'),
    coalesce((select sum(p.amount_net) from public.payments p where p.professional_id = p_user_id and p.status = 'pago_liberado'), 0),
    coalesce((select sum(p.platform_fee + p.tax_amount) from public.payments p where p.professional_id = p_user_id and p.status = 'pago_liberado'), 0)
  from public.wallets w
  where w.user_id = p_user_id;
$$;

-- ─── RLS ──────────────────────────────────────────────────────────────────────

alter table public.service_proposals enable row level security;
alter table public.work_orders enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.payment_disputes enable row level security;

create policy "proposals_select" on public.service_proposals for select to authenticated using (
  professional_id = auth.uid()
  or exists (select 1 from public.solicitudes_de_servicio r where r.id = request_id and r.client_id = auth.uid())
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy "proposals_insert_professional" on public.service_proposals for insert to authenticated
with check (professional_id = auth.uid());

create policy "work_orders_select" on public.work_orders for select to authenticated using (
  client_id = auth.uid() or professional_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy "payments_select" on public.payments for select to authenticated using (
  client_id = auth.uid() or professional_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy "payment_events_select" on public.payment_events for select to authenticated using (
  exists (
    select 1 from public.payments p
    where p.id = payment_id
      and (p.client_id = auth.uid() or p.professional_id = auth.uid()
        or exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'admin'))
  )
);

create policy "wallets_select_own" on public.wallets for select to authenticated using (
  user_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy "wallet_tx_select" on public.wallet_transactions for select to authenticated using (
  user_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy "disputes_select" on public.payment_disputes for select to authenticated using (
  opened_by = auth.uid()
  or exists (
    select 1 from public.payments p
    where p.id = payment_id and (p.client_id = auth.uid() or p.professional_id = auth.uid())
  )
  or exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'admin')
);

-- ─── Grants ───────────────────────────────────────────────────────────────────

grant execute on function public.ensure_wallet(uuid) to authenticated;
grant execute on function public.calculate_payment_breakdown(numeric) to authenticated;
grant execute on function public.create_service_proposal(uuid, numeric, text, numeric) to authenticated;
grant execute on function public.accept_service_proposal(uuid) to authenticated;
grant execute on function public.register_payment_received(uuid, text, text, text, text) to authenticated;
grant execute on function public.start_paid_work(uuid) to authenticated;
grant execute on function public.complete_paid_work(uuid) to authenticated;
grant execute on function public.approve_and_release_payment(uuid) to authenticated;
grant execute on function public.get_wallet_summary(uuid) to authenticated;

-- Wallets auto-create on profile creation
insert into public.wallets (user_id)
select id from public.profiles
on conflict (user_id) do nothing;
