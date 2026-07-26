-- Supervisión anti-elusión de comisión: montos en chat vs pago oficial + frases de evasión.

create table if not exists public.commission_risk_flags (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.solicitudes_de_servicio(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  message_id uuid references public.request_messages(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  flag_type text not null check (flag_type in (
    'chat_amount_mismatch',
    'commission_evasion_phrase',
    'proposal_under_chat'
  )),
  chat_amount numeric(12,2),
  official_amount numeric(12,2),
  body_snippet text not null,
  status text not null default 'abierta'
    check (status in ('abierta', 'revisada', 'descartada', 'sancionada')),
  admin_note text,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists commission_risk_flags_status_idx
  on public.commission_risk_flags(status, created_at desc);
create index if not exists commission_risk_flags_request_idx
  on public.commission_risk_flags(request_id, created_at desc);

alter table public.commission_risk_flags enable row level security;

drop policy if exists "commission_risk_flags_super_admin_select" on public.commission_risk_flags;
create policy "commission_risk_flags_super_admin_select"
  on public.commission_risk_flags for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.intranet_role = 'super_admin'
    )
  );

drop policy if exists "commission_risk_flags_super_admin_update" on public.commission_risk_flags;
create policy "commission_risk_flags_super_admin_update"
  on public.commission_risk_flags for update to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.intranet_role = 'super_admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.intranet_role = 'super_admin'
    )
  );

grant select, update on public.commission_risk_flags to authenticated;
grant select, insert, update on public.commission_risk_flags to service_role;

-- Extrae el monto máximo mencionado en un texto (formato CL / $).
create or replace function public.extract_max_money_amount(p_text text)
returns numeric
language plpgsql
immutable
as $$
declare
  v_text text := lower(coalesce(p_text, ''));
  v_match text;
  v_norm text;
  v_val numeric;
  v_max numeric := 0;
begin
  -- $45.000 / 45.000 / $45000
  for v_match in
    select m[1]
    from regexp_matches(
      v_text,
      '\$?\s*([0-9]{1,3}(?:\.[0-9]{3})+|[0-9]{4,7})\s*(?:pesos|clp|lucas)?',
      'gi'
    ) as m
  loop
    v_norm := replace(v_match, '.', '');
    begin
      v_val := v_norm::numeric;
    exception when others then
      continue;
    end;
    -- Ignora rangos típicos de teléfono / años irrelevantes
    if v_val between 5000 and 5000000 then
      if v_val > v_max then v_max := v_val; end if;
    end if;
  end loop;

  return nullif(v_max, 0);
end;
$$;

create or replace function public.request_official_amount(p_request_id uuid)
returns numeric
language sql
stable
as $$
  select greatest(
    coalesce((
      select max(amount) from public.service_proposals
      where request_id = p_request_id
        and status in ('pendiente', 'aceptada')
    ), 0),
    coalesce((
      select max(amount_gross) from public.payments
      where request_id = p_request_id
        and status not in ('cancelado', 'reembolsado')
    ), 0)
  );
$$;

create or replace function public.flag_commission_risk(
  p_request_id uuid,
  p_actor_id uuid,
  p_message_id uuid,
  p_flag_type text,
  p_chat_amount numeric,
  p_official_amount numeric,
  p_snippet text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment_id uuid;
begin
  -- Evita spam: no duplicar misma señal abierta en 2 horas
  if exists (
    select 1 from public.commission_risk_flags f
    where f.request_id = p_request_id
      and f.flag_type = p_flag_type
      and f.status = 'abierta'
      and f.created_at > now() - interval '2 hours'
      and coalesce(f.chat_amount, -1) = coalesce(p_chat_amount, -1)
  ) then
    return;
  end if;

  select id into v_payment_id
  from public.payments
  where request_id = p_request_id
  order by created_at desc
  limit 1;

  insert into public.commission_risk_flags (
    request_id, payment_id, message_id, actor_id, flag_type,
    chat_amount, official_amount, body_snippet
  ) values (
    p_request_id, v_payment_id, p_message_id, p_actor_id, p_flag_type,
    p_chat_amount, p_official_amount, left(trim(coalesce(p_snippet, '')), 400)
  );
end;
$$;

create or replace function public.supervise_message_commission_risk()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_official numeric;
  v_chat numeric;
  v_body text := lower(coalesce(new.body, ''));
begin
  v_official := public.request_official_amount(new.request_id);
  v_chat := public.extract_max_money_amount(new.body);

  if v_body ~ '(menos[[:space:]]*comisi[oó]n|bajar[[:space:]]*comisi|eludir[[:space:]]*comisi|fuera[[:space:]]*de[[:space:]]*zovit|cobro[[:space:]]*aparte|resto[[:space:]]*en[[:space:]]*efectivo|el[[:space:]]*resto[[:space:]]*afuera|monto[[:space:]]*menor[[:space:]]*en[[:space:]]*(la[[:space:]]*)?(app|zovit)|pon(e|emos)?[[:space:]]*menos|te[[:space:]]*rebajo)' then
    perform public.flag_commission_risk(
      new.request_id, new.sender_id, new.id,
      'commission_evasion_phrase', v_chat, nullif(v_official, 0), new.body
    );
  end if;

  -- Chat menciona precio claramente mayor al registrado (posible subdeclaración)
  if v_chat is not null and v_official is not null and v_official >= 1000 then
    if v_chat >= v_official * 1.25 or (v_chat - v_official) >= 15000 then
      perform public.flag_commission_risk(
        new.request_id, new.sender_id, new.id,
        'chat_amount_mismatch', v_chat, v_official, new.body
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_supervise_message_commission on public.request_messages;
create trigger trg_supervise_message_commission
  after insert on public.request_messages
  for each row execute function public.supervise_message_commission_risk();

-- Si crean una propuesta menor a montos ya hablados en el chat
create or replace function public.supervise_proposal_commission_risk()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chat_max numeric;
begin
  select max(public.extract_max_money_amount(m.body))
  into v_chat_max
  from public.request_messages m
  where m.request_id = new.request_id;

  if v_chat_max is not null
     and new.amount is not null
     and (v_chat_max >= new.amount * 1.25 or (v_chat_max - new.amount) >= 15000)
  then
    perform public.flag_commission_risk(
      new.request_id, new.professional_id, null,
      'proposal_under_chat', v_chat_max, new.amount,
      'Propuesta ' || to_char(new.amount, 'FM999999999') ||
        ' CLP vs monto hablado en chat ' || to_char(v_chat_max, 'FM999999999') || ' CLP'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_supervise_proposal_commission on public.service_proposals;
create trigger trg_supervise_proposal_commission
  after insert on public.service_proposals
  for each row execute function public.supervise_proposal_commission_risk();

create or replace function public.resolve_commission_risk_flag(
  p_flag_id uuid,
  p_status text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.intranet_role = 'super_admin'
  ) then
    raise exception 'Solo super administrador';
  end if;
  if p_status not in ('revisada', 'descartada', 'sancionada') then
    raise exception 'Estado inválido';
  end if;

  update public.commission_risk_flags
  set status = p_status,
      admin_note = nullif(trim(coalesce(p_note, '')), ''),
      resolved_by = auth.uid(),
      resolved_at = now()
  where id = p_flag_id and status = 'abierta';

  if not found then
    raise exception 'Alerta no encontrada o ya resuelta';
  end if;
end;
$$;

grant execute on function public.resolve_commission_risk_flag(uuid, text, text) to authenticated;
