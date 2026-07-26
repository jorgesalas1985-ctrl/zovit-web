-- Chat seguro (anti-contacto) + trabajo adicional fácil con pago protegido.

alter table public.service_proposals
  add column if not exists proposal_kind text not null default 'initial'
    check (proposal_kind in ('initial', 'additional'));

-- ─── Sanitizar mensajes (teléfono / email / wsp) ──────────────────────────────

create or replace function public.sanitize_request_message_body()
returns trigger
language plpgsql
as $$
declare
  v_body text := coalesce(new.body, '');
begin
  -- Emails
  v_body := regexp_replace(
    v_body,
    '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}',
    '[contacto oculto]',
    'gi'
  );
  -- Teléfonos Chile / largos
  v_body := regexp_replace(
    v_body,
    '(?:\+?56[\s\-\.]*)?(?:9[\s\-\.]*)?[0-9]{4}[\s\-\.]?[0-9]{4}|[0-9]{8,11}',
    '[contacto oculto]',
    'gi'
  );
  -- Palabras de fuga
  v_body := regexp_replace(
    v_body,
    '(whats?app|wsp|wasap|telegram|instagram|facebook|ll[aá]mame|escr[ií]beme|al[[:space:]]*cel|mi[[:space:]]*n[uú]mero)',
    '[coordina en ZOVIT]',
    'gi'
  );

  new.body := left(trim(v_body), 2000);
  if length(new.body) < 1 then
    raise exception 'El mensaje no puede quedar vacío tras el filtro de seguridad ZOVIT';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sanitize_request_message on public.request_messages;
create trigger trg_sanitize_request_message
  before insert or update of body on public.request_messages
  for each row execute function public.sanitize_request_message_body();

-- ─── Cliente crea pago de trabajo adicional (fácil) ───────────────────────────

create or replace function public.client_create_additional_payment(
  p_request_id uuid,
  p_amount numeric,
  p_description text
)
returns table (work_order_id uuid, payment_id uuid, payment_public_id text)
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.solicitudes_de_servicio%rowtype;
  breakdown record;
  proposal_id uuid;
  v_work_order_id uuid;
  v_payment_id uuid;
  v_payment_public_id text;
  v_desc text := trim(coalesce(p_description, ''));
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if p_amount is null or p_amount < 1000 then
    raise exception 'El monto mínimo del trabajo adicional es $1.000';
  end if;
  if length(v_desc) < 8 then
    raise exception 'Describe el trabajo adicional (mín. 8 caracteres)';
  end if;

  select * into request_row
  from public.solicitudes_de_servicio
  where id = p_request_id
  for update;

  if not found then raise exception 'Solicitud no encontrada'; end if;
  if request_row.client_id <> auth.uid() then
    raise exception 'Solo el cliente puede agregar trabajo adicional';
  end if;
  if request_row.professional_id is null then
    raise exception 'Primero debe haber un profesional asignado';
  end if;
  if request_row.status not in ('aceptada', 'en_camino', 'en_ejecucion') then
    raise exception 'No puedes agregar trabajo adicional en este estado';
  end if;

  -- Debe existir al menos un pago retenido/en curso (trabajo ya pagado en ZOVIT).
  if not exists (
    select 1 from public.payments p
    where p.request_id = p_request_id
      and p.professional_id = request_row.professional_id
      and p.status in (
        'pago_retenido', 'trabajo_en_ejecucion', 'esperando_aprobacion_cliente', 'pago_liberado'
      )
  ) then
    raise exception 'Paga el servicio principal en ZOVIT antes de agregar trabajo adicional';
  end if;

  select * into breakdown from public.calculate_payment_breakdown(p_amount);

  insert into public.service_proposals (
    request_id, professional_id, amount, description, estimated_hours, status, proposal_kind
  ) values (
    p_request_id, request_row.professional_id, p_amount, v_desc, null, 'aceptada', 'additional'
  ) returning id into proposal_id;

  insert into public.work_orders (
    request_id, proposal_id, client_id, professional_id, amount, status
  ) values (
    p_request_id, proposal_id, request_row.client_id, request_row.professional_id, p_amount, 'activa'
  ) returning id into v_work_order_id;

  insert into public.payments (
    work_order_id, request_id, client_id, professional_id,
    amount_gross, platform_fee, tax_amount, amount_net,
    status, idempotency_key
  ) values (
    v_work_order_id, p_request_id, request_row.client_id, request_row.professional_id,
    breakdown.amount_gross, breakdown.platform_fee, breakdown.tax_amount, breakdown.amount_net,
    'esperando_pago', 'add-' || v_work_order_id::text
  ) returning id, public_id into v_payment_id, v_payment_public_id;

  insert into public.request_messages (request_id, sender_id, body)
  values (
    p_request_id,
    auth.uid(),
    'Trabajo adicional acordado en ZOVIT: ' || v_desc || ' · Monto ' ||
      to_char(p_amount, 'FM999999999') || ' CLP. Pendiente de pago protegido.'
  );

  insert into public.notifications(user_id, request_id, title, body)
  values (
    request_row.professional_id,
    p_request_id,
    'Trabajo adicional por pagar',
    'El cliente agregó un trabajo adicional. Se acreditará cuando pague en ZOVIT.'
  );

  perform public.log_payment_event(
    v_payment_id, 'trabajo_adicional_creado', null, 'esperando_pago',
    breakdown.amount_gross, breakdown.platform_fee, breakdown.tax_amount, null, auth.uid()
  );

  return query select v_work_order_id, v_payment_id, v_payment_public_id;
end;
$$;

grant execute on function public.client_create_additional_payment(uuid, numeric, text) to authenticated;
