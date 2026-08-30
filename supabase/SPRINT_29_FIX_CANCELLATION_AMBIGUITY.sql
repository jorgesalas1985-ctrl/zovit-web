-- Hotfix idempotente para bases donde SPRINT_15/16 ya fueron aplicados.
-- El retorno TABLE declara request_id, por lo que toda columna homónima
-- queda calificada explícitamente para evitar ambigüedad en PL/pgSQL.
create or replace function public.client_cancel_service_request(p_request_id uuid)
returns table (
  request_id uuid,
  fee_id uuid,
  fee_amount numeric,
  fee_status text,
  fee_public_id text
)
language plpgsql security definer set search_path=public as $$
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
    select 1 from public.cancellation_fees as cf
    where cf.request_id = p_request_id and cf.status in ('pendiente', 'pagada', 'retenida_escrow')
  ) then raise exception 'Esta solicitud ya tiene un cargo de cancelación'; end if;

  select * into preview from public.preview_client_cancellation(p_request_id);

  update public.payments as pmt set status = 'cancelado', updated_at = now()
  where pmt.request_id = p_request_id and pmt.status in ('pendiente', 'esperando_pago');
  update public.work_orders as wo set status = 'cancelada', updated_at = now()
  where wo.request_id = p_request_id and wo.status in ('pendiente', 'activa');
  update public.service_proposals as sp set status = 'retirada', updated_at = now()
  where sp.request_id = p_request_id and sp.status = 'pendiente';
  update public.solicitudes_de_servicio as sr set status = 'cancelada', updated_at = now()
  where sr.id = p_request_id;

  select pmt2.id into v_related_payment from public.payments as pmt2
  where pmt2.request_id = p_request_id and pmt2.status in
    ('pago_retenido', 'trabajo_en_ejecucion', 'esperando_aprobacion_cliente', 'en_disputa')
  order by pmt2.created_at desc limit 1;

  if preview.fee_amount <= 0 then v_fee_status := 'condonada';
  elsif preview.has_held_payment then v_fee_status := 'retenida_escrow';
  else v_fee_status := 'pendiente'; end if;

  insert into public.cancellation_fees (
    request_id, client_id, amount, reason, status, related_payment_id, paid_at
  ) values (
    p_request_id, r.client_id, preview.fee_amount, preview.reason, v_fee_status,
    v_related_payment, case when v_fee_status in ('retenida_escrow', 'condonada') then now() else null end
  ) returning id, public_id into v_fee_id, v_fee_public_id;

  if v_related_payment is not null and preview.fee_amount > 0 then
    perform public.log_payment_event(
      v_related_payment, 'cargo_cancelacion', null, null, preview.fee_amount,
      preview.fee_amount, 0, null, auth.uid(),
      jsonb_build_object('cancellation_fee_id', v_fee_id, 'fee_status', v_fee_status)
    );
  end if;

  if r.professional_id is not null then
    insert into public.notifications(user_id, request_id, title, body) values (
      r.professional_id, p_request_id, 'Solicitud cancelada',
      'El cliente canceló la solicitud. Si correspondía, ZOVIT aplicó un cargo mínimo por cancelación.'
    );
  end if;

  insert into public.notifications(user_id, request_id, title, body) values (
    r.client_id, p_request_id,
    case when v_fee_status = 'pendiente' then 'Cargo por cancelación pendiente'
         when v_fee_status = 'retenida_escrow' then 'Cargo por cancelación aplicado'
         else 'Solicitud cancelada' end,
    case when v_fee_status = 'pendiente' then
           'Debes pagar $' || to_char(preview.fee_amount, 'FM999999999') || ' CLP en ZOVIT antes de publicar otra solicitud.'
         when v_fee_status = 'retenida_escrow' then
           'Se retuvo $' || to_char(preview.fee_amount, 'FM999999999') || ' CLP del pago protegido como cargo por cancelación. El saldo restante puede reembolsarse según revisión.'
         else 'Tu solicitud fue cancelada sin cargo.' end
  );

  return query select p_request_id, v_fee_id, preview.fee_amount, v_fee_status, v_fee_public_id;
end;
$$;

grant execute on function public.client_cancel_service_request(uuid) to authenticated;
