-- Sprint 43: exclusión distribuida y persistencia atómica para OCR documental local.
create table if not exists public.operational_document_ocr_claims (
  document_id uuid primary key references public.operational_documents(id) on delete cascade,
  claim_token uuid not null default gen_random_uuid(),
  status text not null check (status in ('claimed', 'completed')),
  lease_expires_at timestamptz not null,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.operational_document_ocr_claims enable row level security;
revoke all privileges on table public.operational_document_ocr_claims from public, anon, authenticated;

create table if not exists public.operational_document_ocr_result_events (
  document_id uuid primary key references public.operational_documents(id) on delete cascade,
  event_id uuid not null references public.operational_document_events(id) on delete restrict,
  created_at timestamptz not null default now()
);
alter table public.operational_document_ocr_result_events enable row level security;
revoke all privileges on table public.operational_document_ocr_result_events from public, anon, authenticated;

create or replace function public.intranet_claim_local_ocr_document(p_document_id uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare now_ts timestamptz := now(); document_status text; prior_status text; prior_lease timestamptz; token uuid;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'Acceso no autorizado'; end if;
  select status into document_status from public.operational_documents where id = p_document_id for update;
  if not found or document_status not in ('submitted', 'ocr_pending') then return null; end if;
  select status, lease_expires_at into prior_status, prior_lease from public.operational_document_ocr_claims where document_id = p_document_id for update;
  if found and prior_status = 'claimed' and prior_lease > now_ts then return null; end if;
  insert into public.operational_document_ocr_claims as c
    (document_id, claim_token, status, lease_expires_at, attempt_count, completed_at, updated_at)
  values (p_document_id, gen_random_uuid(), 'claimed', now_ts + interval '10 minutes', 1, null, now_ts)
  on conflict (document_id) do update set
    claim_token = gen_random_uuid(), status = 'claimed', lease_expires_at = now_ts + interval '10 minutes',
    attempt_count = c.attempt_count + 1, completed_at = null, updated_at = now_ts
  returning claim_token into token;
  return token;
end;
$$;

create or replace function public.intranet_persist_local_ocr_result(
  p_document_id uuid, p_claim_token uuid, p_result_status text, p_extracted_data jsonb,
  p_validation_summary jsonb, p_event_metadata jsonb, p_actor_id uuid default null,
  p_actor_type text default 'operations'
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare claim_status text; claim_lease timestamptz; doc record; target_status text; event_type text; event_id uuid; now_ts timestamptz := now();
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'Acceso no autorizado'; end if;
  if p_result_status not in ('ocr_completed', 'manual_review_requested') then raise exception 'Resultado OCR inválido'; end if;
  select status, lease_expires_at into claim_status, claim_lease from public.operational_document_ocr_claims
  where document_id = p_document_id and claim_token = p_claim_token for update;
  if not found or claim_status <> 'claimed' or claim_lease <= now_ts then raise exception 'Claim OCR inválido o vencido'; end if;
  select id, profile_id, semester_year, semester, status into doc from public.operational_documents where id = p_document_id for update;
  if not found or doc.status not in ('submitted', 'ocr_pending') then raise exception 'Documento no elegible para OCR'; end if;
  target_status := case when p_result_status = 'ocr_completed' then 'ocr_completed' else 'needs_manual_review' end;
  event_type := case when p_result_status = 'ocr_completed' then 'ocr_completed' else 'manual_review_requested' end;
  update public.operational_documents set status = target_status, extracted_data = coalesce(p_extracted_data, '{}'::jsonb),
    validation_summary = coalesce(p_validation_summary, '{}'::jsonb), ocr_engine = 'local_tesseract',
    ocr_processed_at = now_ts, updated_at = now_ts where id = p_document_id;
  insert into public.operational_document_events
    (document_id, profile_id, event_type, semester_year, semester, actor_id, actor_type, summary, metadata)
  values (doc.id, doc.profile_id, event_type, doc.semester_year, doc.semester, p_actor_id, p_actor_type,
    case when event_type = 'ocr_completed' then 'OCR local completado para documento.' else 'Revision manual solicitada.' end,
    coalesce(p_event_metadata, '{}'::jsonb))
  returning id into event_id;
  insert into public.operational_document_ocr_result_events (document_id, event_id)
  values (p_document_id, event_id)
  on conflict (document_id) do nothing;
  if not found then
    select event_id into event_id from public.operational_document_ocr_result_events where document_id = p_document_id;
  end if;
  update public.operational_document_ocr_claims set status = 'completed', completed_at = now_ts, updated_at = now_ts
  where document_id = p_document_id and claim_token = p_claim_token;
  return event_id;
end;
$$;

revoke all on function public.intranet_claim_local_ocr_document(uuid) from public;
revoke all on function public.intranet_persist_local_ocr_result(uuid, uuid, text, jsonb, jsonb, jsonb, uuid, text) from public;
grant execute on function public.intranet_claim_local_ocr_document(uuid) to service_role;
grant execute on function public.intranet_persist_local_ocr_result(uuid, uuid, text, jsonb, jsonb, jsonb, uuid, text) to service_role;
