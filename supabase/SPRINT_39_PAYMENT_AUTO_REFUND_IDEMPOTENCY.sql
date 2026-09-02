-- Sprint 39: claim recuperable para el auto-reembolso de cobros posteriores a cancelación.
create table if not exists public.payment_auto_refund_claims (
  payment_id uuid primary key references public.payments(id) on delete cascade,
  provider_payment_id text not null unique,
  idempotency_key text not null unique,
  claim_token uuid not null default gen_random_uuid(),
  status text not null check (status in ('claimed', 'submitted', 'completed', 'failed', 'uncertain')),
  lease_expires_at timestamptz not null,
  attempt_count integer not null default 1 check (attempt_count > 0),
  provider_refund_id text,
  last_error text,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.payment_auto_refund_claims enable row level security;
revoke all privileges on table public.payment_auto_refund_claims from public, anon, authenticated;

create or replace function public.intranet_claim_cancelled_payment_refund(p_payment_id uuid, p_provider_payment_id text)
returns table (claim_token uuid, status text, idempotency_key text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare payment_row public.payments%rowtype; claim_row public.payment_auto_refund_claims%rowtype; now_ts timestamptz := now();
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'Acceso no autorizado'; end if;
  select * into payment_row from public.payments where id = p_payment_id for update;
  if not found or payment_row.status <> 'cancelado' then raise exception 'El pago no está cancelado'; end if;
  select * into claim_row from public.payment_auto_refund_claims where payment_id = p_payment_id for update;
  if found and claim_row.provider_payment_id <> p_provider_payment_id then raise exception 'Referencia del proveedor no coincide'; end if;
  if found and claim_row.status = 'completed' then claim_token := claim_row.claim_token; status := 'completed'; idempotency_key := claim_row.idempotency_key; return next; return; end if;
  if found and claim_row.status in ('claimed', 'submitted') and claim_row.lease_expires_at > now_ts then return; end if;
  insert into public.payment_auto_refund_claims as c (payment_id, provider_payment_id, idempotency_key, claim_token, status, lease_expires_at, attempt_count, provider_refund_id, last_error, completed_at, updated_at)
  values (p_payment_id, p_provider_payment_id, 'zovit-refund-' || p_payment_id::text, gen_random_uuid(), 'claimed', now_ts + interval '5 minutes', 1, null, null, null, now_ts)
  on conflict (payment_id) do update set claim_token = gen_random_uuid(), status = 'claimed', lease_expires_at = now_ts + interval '5 minutes', attempt_count = c.attempt_count + 1, last_error = null, updated_at = now_ts
  returning c.claim_token, c.status, c.idempotency_key into claim_token, status, idempotency_key;
  return next;
end;
$$;

create or replace function public.intranet_mark_cancelled_payment_refund_submitted(p_claim_token uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'Acceso no autorizado'; end if;
  update public.payment_auto_refund_claims set status = 'submitted', updated_at = now() where claim_token = p_claim_token and status = 'claimed' and lease_expires_at > now();
  if not found then raise exception 'Claim de reembolso inválido o expirado'; end if;
end;
$$;

create or replace function public.intranet_record_cancelled_payment_refund_failure(p_claim_token uuid, p_status text, p_error text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' or p_status not in ('failed', 'uncertain') then raise exception 'Acceso no autorizado'; end if;
  update public.payment_auto_refund_claims set status = p_status, last_error = left(coalesce(p_error, ''), 500), lease_expires_at = now(), updated_at = now() where claim_token = p_claim_token and status in ('claimed', 'submitted');
end;
$$;

create or replace function public.intranet_complete_cancelled_payment_refund(p_claim_token uuid, p_provider_refund_id text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare claim_row public.payment_auto_refund_claims%rowtype;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'Acceso no autorizado'; end if;
  select * into claim_row from public.payment_auto_refund_claims where claim_token = p_claim_token for update;
  if not found then raise exception 'Claim de reembolso inválido'; end if;
  if claim_row.status = 'completed' then return; end if;
  if claim_row.status <> 'submitted' then raise exception 'Claim de reembolso no enviado'; end if;
  insert into public.payment_events (payment_id, event_type, old_status, new_status, metadata)
  select claim_row.payment_id, 'auto_refund_after_cancel', 'cancelado', 'cancelado', jsonb_build_object('provider_reference', claim_row.provider_payment_id, 'provider_refund_id', p_provider_refund_id, 'reason', 'Pago MP recibido tras cancelación de la orden ZOVIT')
  where not exists (select 1 from public.payment_events where payment_id = claim_row.payment_id and event_type = 'auto_refund_after_cancel');
  update public.payment_auto_refund_claims set status = 'completed', provider_refund_id = coalesce(p_provider_refund_id, provider_refund_id), completed_at = now(), lease_expires_at = now(), last_error = null, updated_at = now() where payment_id = claim_row.payment_id;
end;
$$;

revoke all on function public.intranet_claim_cancelled_payment_refund(uuid, text) from public;
revoke all on function public.intranet_mark_cancelled_payment_refund_submitted(uuid) from public;
revoke all on function public.intranet_record_cancelled_payment_refund_failure(uuid, text, text) from public;
revoke all on function public.intranet_complete_cancelled_payment_refund(uuid, text) from public;
grant execute on function public.intranet_claim_cancelled_payment_refund(uuid, text) to service_role;
grant execute on function public.intranet_mark_cancelled_payment_refund_submitted(uuid) to service_role;
grant execute on function public.intranet_record_cancelled_payment_refund_failure(uuid, text, text) to service_role;
grant execute on function public.intranet_complete_cancelled_payment_refund(uuid, text) to service_role;
