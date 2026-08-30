-- IVA del servicio retenido por ZOVIT para conciliación mensual del F29.
alter table public.payments
  add column if not exists service_vat_withheld numeric(12,2) not null default 0
  check (service_vat_withheld >= 0);

comment on column public.payments.service_vat_withheld is
  'IVA del servicio retenido por ZOVIT. Se guarda al crear el pago y no forma parte del retiro profesional.';

-- Al aceptar un trabajo se crea automáticamente la orden que el cliente pagará.
create or replace function public.accept_service_request(request_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare
  caller_id uuid := auth.uid();
  request_row public.solicitudes_de_servicio%rowtype;
  professional_row public.profiles%rowtype;
  proposal_id uuid;
  work_order_id uuid;
  payment_id uuid;
  fuel_amount numeric := 0;
  distance_km numeric := 0.5;
  arrival_minutes numeric := 5;
  service_net numeric := 0;
  service_vat numeric := 0;
  zovit_fee numeric := 0;
  zovit_fee_vat numeric := 0;
  client_subtotal numeric := 0;
  professional_payout numeric := 0;
begin
  if caller_id is null then raise exception 'Sesión no válida'; end if;

  select * into professional_row from public.profiles where id = caller_id;
  if not found or (
    coalesce(professional_row.role, '') not in ('professional', 'admin')
    and coalesce(professional_row.can_act_as_professional, false) is not true
  ) then raise exception 'Solo un profesional puede aceptar trabajos'; end if;

  select * into request_row from public.solicitudes_de_servicio where id = request_id for update;
  if not found or request_row.status <> 'publicada' or request_row.professional_id is not null
     or request_row.client_id = caller_id then
    raise exception 'El trabajo ya fue aceptado, no está disponible o es tu propia solicitud';
  end if;

  fuel_amount := coalesce(request_row.estimated_budget, 0);
  if fuel_amount > 0 and fuel_amount < 1000 then fuel_amount := fuel_amount * 1000; end if;

  if request_row.client_latitude is not null and request_row.client_longitude is not null
     and professional_row.latitude is not null and professional_row.longitude is not null then
    distance_km := greatest(0.5, 6371 * 2 * asin(sqrt(
      power(sin(radians(professional_row.latitude - request_row.client_latitude) / 2), 2) +
      cos(radians(request_row.client_latitude)) * cos(radians(professional_row.latitude)) *
      power(sin(radians(professional_row.longitude - request_row.client_longitude) / 2), 2)
    )));
  end if;

  arrival_minutes := greatest(5, round((distance_km / 25) * 60));
  service_net := 4000 + round(distance_km * 600) + (arrival_minutes * 100);
  service_vat := round(service_net * 0.19);
  zovit_fee := round(service_net * 0.10);
  zovit_fee_vat := round(zovit_fee * 0.19);
  client_subtotal := round(fuel_amount + service_net + service_vat + zovit_fee + zovit_fee_vat);
  professional_payout := round(fuel_amount + service_net);

  insert into public.service_proposals (
    request_id, professional_id, amount, description, status
  ) values (
    request_id, caller_id, client_subtotal, 'Cotización automática ZOVIT', 'aceptada'
  ) returning id into proposal_id;

  insert into public.work_orders (
    request_id, proposal_id, client_id, professional_id, amount, status
  ) values (
    request_id, proposal_id, request_row.client_id, caller_id, client_subtotal, 'activa'
  ) returning id into work_order_id;

  insert into public.payments (
    work_order_id, request_id, client_id, professional_id,
    amount_gross, platform_fee, tax_amount, amount_net, service_vat_withheld,
    status, provider, idempotency_key
  ) values (
    work_order_id, request_id, request_row.client_id, caller_id,
    client_subtotal, zovit_fee, zovit_fee_vat, professional_payout, service_vat,
    'esperando_pago', 'mercadopago', 'auto-pay-' || work_order_id::text
  ) returning id into payment_id;

  update public.solicitudes_de_servicio
  set professional_id = caller_id, status = 'aceptada', updated_at = now()
  where id = request_id;

  perform public.log_payment_event(
    payment_id, 'orden_automatica_creada', null, 'esperando_pago',
    client_subtotal, zovit_fee, zovit_fee_vat, null, caller_id
  );

  insert into public.notifications(user_id, request_id, title, body)
  values (request_row.client_id, request_id, 'Servicio aceptado: pago disponible',
    'Un profesional aceptó tu servicio. Ya puedes pagarlo de forma protegida en ZOVIT.');
end;
$$;

grant execute on function public.accept_service_request(uuid) to authenticated;

-- Los cambios de ejecución se realizan exclusivamente por las RPC de pagos:
-- start_paid_work y complete_paid_work. Así no se puede iniciar sin pago retenido.
create or replace function public.change_service_request_status(request_id uuid, new_status text)
returns void language plpgsql security definer set search_path=public as $$
declare
  r public.solicitudes_de_servicio%rowtype;
begin
  select * into r from public.solicitudes_de_servicio where id = request_id for update;
  if not found then raise exception 'Solicitud no encontrada'; end if;

  if auth.uid() = r.client_id and new_status = 'cancelada' and r.status = 'publicada' then
    update public.solicitudes_de_servicio set status = 'cancelada', updated_at = now() where id = request_id;
    return;
  end if;

  if exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    update public.solicitudes_de_servicio set status = new_status, updated_at = now() where id = request_id;
    return;
  end if;

  raise exception 'El avance del trabajo debe realizarse desde el pago protegido de ZOVIT';
end;
$$;
