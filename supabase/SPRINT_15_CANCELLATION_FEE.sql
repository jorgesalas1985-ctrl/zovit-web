-- Cargo mínimo por cancelación de solicitudes (anti-abuso).

create table if not exists public.cancellation_fees (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default (
    'ZVT-CFEE-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
  ),
  request_id uuid not null references public.solicitudes_de_servicio(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'CLP',
  reason text not null check (reason in (
    'after_proposal', 'after_accept', 'after_payment', 'repeat_cancel', 'free_publicada'
  )),
  status text not null default 'pendiente'
    check (status in ('pendiente', 'pagada', 'retenida_escrow', 'condonada')),
  related_payment_id uuid references public.payments(id) on delete set null,
  provider text,
  provider_reference text,
  provider_session_id text,
  paid_at timestamptz,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cancellation_fees_client_status_idx
  on public.cancellation_fees(client_id, status, created_at desc);
create index if not exists cancellation_fees_request_idx
  on public.cancellation_fees(request_id);

alter table public.cancellation_fees enable row level security;

drop policy if exists "cancellation_fees_select_own" on public.cancellation_fees;
create policy "cancellation_fees_select_own" on public.cancellation_fees
  for select to authenticated using (
    client_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.intranet_role = 'super_admin'
    )
  );

drop policy if exists "cancellation_fees_super_admin_update" on public.cancellation_fees;
create policy "cancellation_fees_super_admin_update" on public.cancellation_fees
  for update to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.intranet_role = 'super_admin'
    )
  ) with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.intranet_role = 'super_admin'
    )
  );

grant select on public.cancellation_fees to authenticated;
grant select, insert, update on public.cancellation_fees to service_role;

-- ─── Preview ──────────────────────────────────────────────────────────────────

create or replace function public.preview_client_cancellation(p_request_id uuid)
returns table (
  fee_amount numeric,
  fee_applies boolean,
  reason text,
  has_held_payment boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.solicitudes_de_servicio%rowtype;
  v_has_proposals boolean;
  v_has_payment boolean;
  v_has_held boolean;
  v_recent_cancels int;
  v_reason text;
  v_fee numeric := 3000;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;

  select * into r from public.solicitudes_de_servicio where id = p_request_id;
  if not found then raise exception 'Solicitud no encontrada'; end if;
  if r.client_id <> auth.uid()
     and not exists (
       select 1 from public.profiles p
       where p.id = auth.uid() and (p.role = 'admin' or p.intranet_role = 'super_admin')
     )
  then
    raise exception 'Sin permiso';
  end if;

  if r.status not in ('publicada', 'aceptada') then
    raise exception 'Esta solicitud no se puede cancelar en su estado actual';
  end if;

  select exists (
    select 1 from public.service_proposals sp
    where sp.request_id = p_request_id and sp.status in ('pendiente', 'aceptada')
  ) into v_has_proposals;

  select exists (
    select 1 from public.payments p
    where p.request_id = p_request_id and p.status not in ('cancelado', 'reembolsado')
  ) into v_has_payment;

  select exists (
    select 1 from public.payments p
    where p.request_id = p_request_id
      and p.status in (
        'pago_retenido', 'trabajo_en_ejecucion', 'esperando_aprobacion_cliente', 'en_disputa'
      )
  ) into v_has_held;

  -- 1 cancelación gratuita / 30 días solo si sigue publicada y sin propuestas.
  select count(*)::int into v_recent_cancels
  from public.cancellation_fees cf
  where cf.client_id = r.client_id
    and cf.created_at > now() - interval '30 days';

  if r.status = 'aceptada' then
    v_reason := 'after_accept';
  elsif v_has_payment then
    v_reason := 'after_payment';
  elsif v_has_proposals then
    v_reason := 'after_proposal';
  elsif v_recent_cancels >= 1 then
    v_reason := 'repeat_cancel';
  else
    v_reason := 'free_publicada';
    v_fee := 0;
  end if;

  return query select
    v_fee,
    (v_fee > 0),
    v_reason,
    v_has_held;
end;
$$;

grant execute on function public.preview_client_cancellation(uuid) to authenticated;

-- ─── Cancelar con cargo ───────────────────────────────────────────────────────

create or replace function public.client_cancel_service_request(p_request_id uuid)
returns table (
  request_id uuid,
  fee_id uuid,
  fee_amount numeric,
  fee_status text,
  fee_public_id text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.solicitudes_de_servicio%rowtype;
  preview record;
  v_fee_id uuid;
  v_fee_status text;
  v_fee_public_id text;
  v_related_payment uuid;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;

  select * into r from public.solicitudes_de_servicio where id = p_request_id for update;
  if not found then raise exception 'Solicitud no encontrada'; end if;
  if r.client_id <> auth.uid() then raise exception 'Solo el cliente puede cancelar'; end if;
  if r.status not in ('publicada', 'aceptada') then
    raise exception 'Esta solicitud no se puede cancelar en su estado actual';
  end if;

  if exists (
    select 1 from public.cancellation_fees cf
    where cf.request_id = p_request_id and cf.status in ('pendiente', 'pagada', 'retenida_escrow')
  ) then
    raise exception 'Esta solicitud ya tiene un cargo de cancelación';
  end if;

  select * into preview from public.preview_client_cancellation(p_request_id);

  -- Cancela pagos aún no cobrados
  update public.payments
  set status = 'cancelado', updated_at = now()
  where request_id = p_request_id and status in ('pendiente', 'esperando_pago');

  update public.work_orders
  set status = 'cancelada', updated_at = now()
  where request_id = p_request_id and status in ('pendiente', 'activa');

  update public.service_proposals
  set status = 'retirada', updated_at = now()
  where request_id = p_request_id and status = 'pendiente';

  update public.solicitudes_de_servicio
  set status = 'cancelada', updated_at = now()
  where id = p_request_id;

  select id into v_related_payment
  from public.payments
  where request_id = p_request_id
    and status in (
      'pago_retenido', 'trabajo_en_ejecucion', 'esperando_aprobacion_cliente', 'en_disputa'
    )
  order by created_at desc
  limit 1;

  if preview.fee_amount <= 0 then
    v_fee_status := 'condonada';
  elsif preview.has_held_payment then
    v_fee_status := 'retenida_escrow';
  else
    v_fee_status := 'pendiente';
  end if;

  insert into public.cancellation_fees (
    request_id, client_id, amount, reason, status, related_payment_id, paid_at
  ) values (
    p_request_id,
    r.client_id,
    preview.fee_amount,
    preview.reason,
    v_fee_status,
    v_related_payment,
    case when v_fee_status in ('retenida_escrow', 'condonada') then now() else null end
  )
  returning id, public_id into v_fee_id, v_fee_public_id;

  if v_related_payment is not null and preview.fee_amount > 0 then
    perform public.log_payment_event(
      v_related_payment,
      'cargo_cancelacion',
      null,
      null,
      preview.fee_amount,
      preview.fee_amount,
      0,
      null,
      auth.uid(),
      jsonb_build_object('cancellation_fee_id', v_fee_id, 'fee_status', v_fee_status)
    );
  end if;

  if r.professional_id is not null then
    insert into public.notifications(user_id, request_id, title, body)
    values (
      r.professional_id, p_request_id,
      'Solicitud cancelada',
      'El cliente canceló la solicitud. Si correspondía, ZOVIT aplicó un cargo mínimo por cancelación.'
    );
  end if;

  insert into public.notifications(user_id, request_id, title, body)
  values (
    r.client_id, p_request_id,
    case
      when v_fee_status = 'pendiente' then 'Cargo por cancelación pendiente'
      when v_fee_status = 'retenida_escrow' then 'Cargo por cancelación aplicado'
      else 'Solicitud cancelada'
    end,
    case
      when v_fee_status = 'pendiente' then
        'Debes pagar $' || to_char(preview.fee_amount, 'FM999999999') ||
        ' CLP en ZOVIT antes de publicar otra solicitud.'
      when v_fee_status = 'retenida_escrow' then
        'Se retuvo $' || to_char(preview.fee_amount, 'FM999999999') ||
        ' CLP del pago protegido como cargo por cancelación. El saldo restante puede reembolsarse según revisión.'
      else 'Tu solicitud fue cancelada sin cargo.'
    end
  );

  return query select p_request_id, v_fee_id, preview.fee_amount, v_fee_status, v_fee_public_id;
end;
$$;

grant execute on function public.client_cancel_service_request(uuid) to authenticated;

-- Bloquear nuevas solicitudes con cargos pendientes
create or replace function public.prevent_request_with_unpaid_cancel_fee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.cancellation_fees cf
    where cf.client_id = new.client_id and cf.status = 'pendiente' and cf.amount > 0
  ) then
    raise exception 'Debes pagar el cargo por cancelación pendiente en ZOVIT antes de publicar otra solicitud.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_unpaid_cancel_fee on public.solicitudes_de_servicio;
create trigger trg_prevent_unpaid_cancel_fee
  before insert on public.solicitudes_de_servicio
  for each row execute function public.prevent_request_with_unpaid_cancel_fee();

-- Marcar cargo pagado (service_role / webhook)
create or replace function public.mark_cancellation_fee_paid(
  p_fee_id uuid,
  p_provider text,
  p_provider_reference text,
  p_provider_session_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.cancellation_fees
  set status = 'pagada',
      provider = p_provider,
      provider_reference = p_provider_reference,
      provider_session_id = p_provider_session_id,
      paid_at = now(),
      updated_at = now()
  where id = p_fee_id and status = 'pendiente';

  if not found then
    -- idempotente si ya estaba pagada
    if not exists (
      select 1 from public.cancellation_fees where id = p_fee_id and status = 'pagada'
    ) then
      raise exception 'Cargo no encontrado o no pendiente';
    end if;
  end if;
end;
$$;

grant execute on function public.mark_cancellation_fee_paid(uuid, text, text, text) to service_role;

-- Super admin puede condonar
create or replace function public.waive_cancellation_fee(p_fee_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.intranet_role = 'super_admin'
  ) then
    raise exception 'Solo super administrador';
  end if;

  update public.cancellation_fees
  set status = 'condonada',
      admin_note = nullif(trim(coalesce(p_note, '')), ''),
      paid_at = now(),
      updated_at = now()
  where id = p_fee_id and status = 'pendiente';

  if not found then raise exception 'Cargo no encontrado o no pendiente'; end if;
end;
$$;

grant execute on function public.waive_cancellation_fee(uuid, text) to authenticated;

-- El cliente ya no cancela por change_service_request_status (debe usar RPC con cargo)
create or replace function public.change_service_request_status(request_id uuid, new_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.solicitudes_de_servicio%rowtype;
begin
  select * into r from public.solicitudes_de_servicio where id = request_id;
  if not found then raise exception 'Solicitud no encontrada'; end if;
  if new_status not in ('publicada','aceptada','en_camino','en_ejecucion','finalizada','cancelada') then
    raise exception 'Estado inválido';
  end if;

  if auth.uid() = r.professional_id then
    if not (
      (r.status = 'aceptada' and new_status = 'en_camino')
      or (r.status = 'en_camino' and new_status = 'en_ejecucion')
      or (r.status = 'en_ejecucion' and new_status = 'finalizada')
    ) then
      raise exception 'Cambio de estado no permitido';
    end if;
  elsif auth.uid() = r.client_id then
    if new_status = 'cancelada' then
      raise exception 'Usa la cancelación con cargo de ZOVIT (client_cancel_service_request)';
    end if;
    raise exception 'El cliente no puede realizar ese cambio';
  elsif not exists (
    select 1 from public.profiles
    where id = auth.uid() and (role = 'admin' or intranet_role = 'super_admin')
  ) then
    raise exception 'Sin permiso';
  end if;

  update public.solicitudes_de_servicio
  set status = new_status, updated_at = now()
  where id = request_id;
end;
$$;
