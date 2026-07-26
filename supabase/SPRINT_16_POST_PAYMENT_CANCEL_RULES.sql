-- Reglas post-pago / post-llegada:
-- Si ya hay dinero retenido o el profesional está en camino/ejecución,
-- el cliente NO puede cancelar unilateralmente (solo disputa con revisión).

alter table public.payment_disputes
  add column if not exists dispute_kind text not null default 'general'
    check (dispute_kind in (
      'general',
      'cancelacion_post_pago',
      'cancelacion_post_llegada',
      'calidad_servicio',
      'no_asistencia'
    ));

-- ─── Helpers ──────────────────────────────────────────────────────────────────

create or replace function public.request_has_held_payment(p_request_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.payments p
    where p.request_id = p_request_id
      and p.status in (
        'pago_retenido', 'trabajo_en_ejecucion',
        'esperando_aprobacion_cliente', 'en_disputa'
      )
  );
$$;

create or replace function public.request_post_arrival(p_request_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.solicitudes_de_servicio s
    where s.id = p_request_id
      and s.status in ('en_camino', 'en_ejecucion', 'finalizada')
  )
  or exists (
    select 1 from public.payments p
    where p.request_id = p_request_id
      and p.status in ('trabajo_en_ejecucion', 'esperando_aprobacion_cliente')
  );
$$;

-- ─── Preview / cancel: bloquear si ya hay escrow ──────────────────────────────

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

  v_has_held := public.request_has_held_payment(p_request_id);

  -- Tras pago retenido o llegada del profesional: no hay cancelación unilateral.
  if v_has_held or r.status in ('en_camino', 'en_ejecucion') then
    raise exception
      'Ya hay pago protegido o el profesional está en camino/ejecución. No puedes cancelar unilateralmente. Abre una disputa en Pagos. Los acuerdos fuera de ZOVIT pueden bloquear cuentas.';
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
    false;
end;
$$;

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

  if public.request_has_held_payment(p_request_id)
     or r.status in ('en_camino', 'en_ejecucion') then
    raise exception
      'Ya hay pago protegido o el profesional está en camino/ejecución. No puedes cancelar unilateralmente. Abre una disputa en Pagos. Los acuerdos fuera de ZOVIT pueden bloquear cuentas.';
  end if;

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
    case when v_fee_status = 'condonada' then now() else null end
  )
  returning id, public_id into v_fee_id, v_fee_public_id;

  if r.professional_id is not null then
    insert into public.notifications(user_id, request_id, title, body)
    values (
      r.professional_id, p_request_id,
      'Solicitud cancelada',
      'El cliente canceló la solicitud antes del pago protegido o de la movilización.'
    );
  end if;

  insert into public.notifications(user_id, request_id, title, body)
  values (
    r.client_id, p_request_id,
    case
      when v_fee_status = 'pendiente' then 'Cargo por cancelación pendiente'
      else 'Solicitud cancelada'
    end,
    case
      when v_fee_status = 'pendiente' then
        'Debes pagar $' || to_char(preview.fee_amount, 'FM999999999') ||
        ' CLP en ZOVIT antes de publicar otra solicitud.'
      else 'Tu solicitud fue cancelada sin cargo.'
    end
  );

  return query select p_request_id, v_fee_id, preview.fee_amount, v_fee_status, v_fee_public_id;
end;
$$;

-- ─── Abrir disputa con clasificación post-pago / post-llegada ─────────────────

drop function if exists public.open_payment_dispute(uuid, text);
drop function if exists public.open_payment_dispute(uuid, text, text);

create or replace function public.open_payment_dispute(
  p_payment_id uuid,
  p_reason text,
  p_dispute_kind text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_row public.payments%rowtype;
  request_row public.solicitudes_de_servicio%rowtype;
  dispute_id uuid;
  v_reason text := trim(coalesce(p_reason, ''));
  v_kind text := coalesce(nullif(trim(p_dispute_kind), ''), 'general');
  v_post_arrival boolean := false;
  v_side_deal boolean := false;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if length(v_reason) < 10 then raise exception 'Describe el motivo con al menos 10 caracteres'; end if;

  if v_kind not in (
    'general', 'cancelacion_post_pago', 'cancelacion_post_llegada',
    'calidad_servicio', 'no_asistencia'
  ) then
    raise exception 'Tipo de disputa inválido';
  end if;

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

  select * into request_row
  from public.solicitudes_de_servicio
  where id = payment_row.request_id;

  v_post_arrival := public.request_post_arrival(payment_row.request_id);

  -- Auto-clasificar cancelaciones tras pago / llegada
  if v_kind = 'general' and lower(v_reason) ~ '(cancel|anular|ya no quiero|desistir|no sigo|no contin)' then
    v_kind := case when v_post_arrival then 'cancelacion_post_llegada' else 'cancelacion_post_pago' end;
  end if;

  if v_kind = 'cancelacion_post_pago' and v_post_arrival then
    v_kind := 'cancelacion_post_llegada';
  end if;

  v_side_deal := lower(v_reason) ~ '(fuera|efectivo|whats?app|transfer|aparte|sin zovit|por fuera|de otra forma)';

  insert into public.payment_disputes (payment_id, opened_by, reason, status, dispute_kind)
  values (p_payment_id, auth.uid(), v_reason, 'abierta', v_kind)
  returning id into dispute_id;

  update public.payments
  set status = 'en_disputa', updated_at = now()
  where id = p_payment_id;

  perform public.log_payment_event(
    p_payment_id, 'disputa_abierta', payment_row.status, 'en_disputa',
    payment_row.amount_gross, payment_row.platform_fee, payment_row.tax_amount,
    payment_row.payment_method, auth.uid(),
    jsonb_build_object(
      'dispute_id', dispute_id,
      'reason', v_reason,
      'dispute_kind', v_kind,
      'post_arrival', v_post_arrival,
      'side_deal_signal', v_side_deal
    )
  );

  -- Alerta de supervisión si parece elusión post-llegada / trato fuera
  if v_kind = 'cancelacion_post_llegada' or v_side_deal then
    perform public.flag_commission_risk(
      payment_row.request_id,
      auth.uid(),
      null,
      'commission_evasion_phrase',
      null,
      payment_row.amount_gross,
      'Disputa ' || v_kind || ': ' || left(v_reason, 280)
    );
  end if;

  insert into public.notifications(user_id, request_id, title, body)
  values (
    case
      when auth.uid() = payment_row.client_id then payment_row.professional_id
      else payment_row.client_id
    end,
    payment_row.request_id,
    'Disputa abierta',
    case
      when v_kind = 'cancelacion_post_llegada' then
        'Hay una disputa por cancelación después de la movilización/llegada. ZOVIT revisará el caso; el reembolso no es automático.'
      when v_kind = 'cancelacion_post_pago' then
        'Hay una disputa por cancelación después del pago. ZOVIT revisará el caso; el reembolso no es automático.'
      else
        'Se abrió una disputa sobre el pago. ZOVIT la revisará.'
    end
  );

  return dispute_id;
end;
$$;

grant execute on function public.open_payment_dispute(uuid, text, text) to authenticated;

-- Cliente pide revisión formal de cancelación post-pago (crea disputa tipada)
create or replace function public.client_open_post_payment_cancel_dispute(
  p_request_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.solicitudes_de_servicio%rowtype;
  v_payment_id uuid;
  v_kind text;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if length(v_reason) < 10 then
    raise exception 'Describe el motivo (mín. 10 caracteres)';
  end if;

  select * into r from public.solicitudes_de_servicio where id = p_request_id;
  if not found then raise exception 'Solicitud no encontrada'; end if;
  if r.client_id <> auth.uid() then raise exception 'Solo el cliente puede solicitarlo'; end if;

  if not public.request_has_held_payment(p_request_id) then
    raise exception 'No hay pago protegido activo. Usa la cancelación normal si aún aplica.';
  end if;

  select id into v_payment_id
  from public.payments
  where request_id = p_request_id
    and status in (
      'pago_retenido', 'trabajo_en_ejecucion',
      'esperando_aprobacion_cliente', 'en_disputa'
    )
  order by created_at desc
  limit 1;

  if v_payment_id is null then raise exception 'No hay pago para disputar'; end if;

  v_kind := case
    when public.request_post_arrival(p_request_id) then 'cancelacion_post_llegada'
    else 'cancelacion_post_pago'
  end;

  return public.open_payment_dispute(v_payment_id, v_reason, v_kind);
end;
$$;

grant execute on function public.client_open_post_payment_cancel_dispute(uuid, text) to authenticated;
