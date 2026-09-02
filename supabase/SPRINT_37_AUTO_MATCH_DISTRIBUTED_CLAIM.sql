-- Sprint 37: claim recuperable e invitaciones idempotentes para el auto-match.
create extension if not exists pgcrypto;

create table if not exists public.request_auto_match_claims (
  request_id uuid primary key references public.solicitudes_de_servicio(id) on delete cascade,
  claim_token uuid not null default gen_random_uuid(),
  status text not null default 'claimed' check (status in ('claimed', 'completed', 'failed')),
  lease_expires_at timestamptz not null,
  attempt_count integer not null default 1 check (attempt_count > 0),
  last_error text,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.request_auto_match_claims enable row level security;
revoke all privileges on table public.request_auto_match_claims from public, anon, authenticated;

create table if not exists public.request_auto_match_deliveries (
  request_id uuid not null references public.solicitudes_de_servicio(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  delivery_kind text not null check (delivery_kind in ('professional_invite', 'client_notice')),
  created_at timestamptz not null default now(),
  primary key (request_id, recipient_id, delivery_kind)
);
alter table public.request_auto_match_deliveries enable row level security;
revoke all privileges on table public.request_auto_match_deliveries from public, anon, authenticated;

create or replace function public.intranet_claim_request_auto_match(p_request_id uuid)
returns table (claim_token uuid, client_id uuid, category text, description text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare request_row public.solicitudes_de_servicio%rowtype; claim_row public.request_auto_match_claims%rowtype; now_ts timestamptz := now();
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'Acceso no autorizado'; end if;
  select * into request_row from public.solicitudes_de_servicio where id = p_request_id for update;
  if not found or request_row.status <> 'publicada' or request_row.professional_id is not null or request_row.auto_matched_at is not null then return; end if;
  select * into claim_row from public.request_auto_match_claims where request_id = p_request_id for update;
  if found and claim_row.status = 'completed' then return; end if;
  if found and claim_row.status = 'claimed' and claim_row.lease_expires_at > now_ts then return; end if;
  insert into public.request_auto_match_claims as c (request_id, claim_token, status, lease_expires_at, attempt_count, last_error, completed_at, updated_at)
  values (p_request_id, gen_random_uuid(), 'claimed', now_ts + interval '5 minutes', 1, null, null, now_ts)
  on conflict (request_id) do update set claim_token = gen_random_uuid(), status = 'claimed', lease_expires_at = now_ts + interval '5 minutes', attempt_count = c.attempt_count + 1, last_error = null, completed_at = null, updated_at = now_ts
  returning c.claim_token into claim_token;
  client_id := request_row.client_id; category := request_row.category; description := request_row.description;
  return next;
end;
$$;

create or replace function public.intranet_complete_request_auto_match(
  p_request_id uuid, p_claim_token uuid, p_professional_ids uuid[]
) returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare request_row public.solicitudes_de_servicio%rowtype; claim_row public.request_auto_match_claims%rowtype; now_ts timestamptz := now(); delivered_count integer := 0;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'Acceso no autorizado'; end if;
  select * into request_row from public.solicitudes_de_servicio where id = p_request_id for update;
  if not found or request_row.status <> 'publicada' or request_row.professional_id is not null or request_row.auto_matched_at is not null then raise exception 'Solicitud no disponible para match'; end if;
  select * into claim_row from public.request_auto_match_claims where request_id = p_request_id for update;
  if not found or claim_row.status <> 'claimed' or claim_row.claim_token <> p_claim_token or claim_row.lease_expires_at <= now_ts then raise exception 'Claim de matching inválido o expirado'; end if;

  with inserted_deliveries as (
    insert into public.request_auto_match_deliveries (request_id, recipient_id, delivery_kind)
    select p_request_id, professional_id, 'professional_invite' from unnest(coalesce(p_professional_ids, '{}'::uuid[])) as professional_id
    where professional_id <> request_row.client_id
    on conflict do nothing returning recipient_id
  ), inserted_notifications as (
    insert into public.notifications (user_id, request_id, title, body)
    select recipient_id, p_request_id, 'Nuevo trabajo para ti', 'Hay una solicitud de ' || coalesce(request_row.category, 'servicio') || ' que coincide con tu perfil. Revisa y postula ahora.' from inserted_deliveries
    returning id
  ) select count(*) into delivered_count from inserted_notifications;

  if delivered_count > 0 then
    insert into public.request_auto_match_deliveries (request_id, recipient_id, delivery_kind) values (p_request_id, request_row.client_id, 'client_notice') on conflict do nothing;
    if found then
      insert into public.notifications (user_id, request_id, title, body) values (request_row.client_id, p_request_id, 'Profesionales notificados', 'Avisamos a ' || delivered_count || ' profesionales verificados. Pronto verás propuestas.');
    end if;
  end if;
  update public.solicitudes_de_servicio set auto_matched_at = now_ts, updated_at = now_ts where id = p_request_id and auto_matched_at is null;
  if not found then raise exception 'Solicitud no disponible para match'; end if;
  update public.request_auto_match_claims set status = 'completed', completed_at = now_ts, lease_expires_at = now_ts, updated_at = now_ts where request_id = p_request_id and claim_token = p_claim_token;
  return delivered_count;
end;
$$;

revoke all on function public.intranet_claim_request_auto_match(uuid) from public;
revoke all on function public.intranet_complete_request_auto_match(uuid, uuid, uuid[]) from public;
grant execute on function public.intranet_claim_request_auto_match(uuid) to service_role;
grant execute on function public.intranet_complete_request_auto_match(uuid, uuid, uuid[]) to service_role;
