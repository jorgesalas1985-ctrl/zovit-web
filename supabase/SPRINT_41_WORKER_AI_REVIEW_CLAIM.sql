-- Sprint 41: exclusión mutua recuperable para OCR/IA de registros worker.
create table if not exists public.worker_ai_review_claims (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  claim_token uuid not null default gen_random_uuid(),
  status text not null check (status in ('claimed','completed')),
  lease_expires_at timestamptz not null,
  attempt_count integer not null default 1,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.worker_ai_review_claims enable row level security;
revoke all privileges on table public.worker_ai_review_claims from public, anon, authenticated;

create or replace function public.intranet_claim_worker_ai_review(p_profile_id uuid, p_include_dudosos boolean default false)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare reg_status text; ai_status text; old public.worker_ai_review_claims%rowtype; token uuid; now_ts timestamptz := now();
begin
 if coalesce(auth.jwt() ->> 'role','') <> 'service_role' then raise exception 'Acceso no autorizado'; end if;
 select status, ai_review_status into reg_status, ai_status from public.worker_registrations where profile_id=p_profile_id for update;
 if not found or reg_status <> 'submitted' or not (ai_status is null or ai_status in ('pending','processing') or (p_include_dudosos and ai_status='dudoso')) then return null; end if;
 select * into old from public.worker_ai_review_claims where profile_id=p_profile_id for update;
 if found and old.status='claimed' and old.lease_expires_at > now_ts then return null; end if;
 insert into public.worker_ai_review_claims as c (profile_id,claim_token,status,lease_expires_at,attempt_count,completed_at,updated_at)
 values(p_profile_id,gen_random_uuid(),'claimed',now_ts + interval '10 minutes',1,null,now_ts)
 on conflict(profile_id) do update set claim_token=gen_random_uuid(),status='claimed',lease_expires_at=now_ts + interval '10 minutes',attempt_count=c.attempt_count+1,completed_at=null,updated_at=now_ts
 returning c.claim_token into token;
 update public.worker_registrations set ai_review_status='processing',updated_at=now_ts where profile_id=p_profile_id;
 return token;
end; $$;

create or replace function public.intranet_assert_worker_ai_review_claim(p_profile_id uuid,p_claim_token uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
 if coalesce(auth.jwt() ->> 'role','') <> 'service_role' then raise exception 'Acceso no autorizado'; end if;
 perform 1 from public.worker_ai_review_claims where profile_id=p_profile_id and claim_token=p_claim_token and status='claimed' and lease_expires_at>now() for update;
 if not found then raise exception 'Claim de revisión IA inválido o expirado'; end if;
end; $$;

create or replace function public.intranet_complete_worker_ai_review_claim(p_profile_id uuid,p_claim_token uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
 if coalesce(auth.jwt() ->> 'role','') <> 'service_role' then raise exception 'Acceso no autorizado'; end if;
 update public.worker_ai_review_claims set status='completed',completed_at=now(),lease_expires_at=now(),updated_at=now() where profile_id=p_profile_id and claim_token=p_claim_token and status='claimed';
 if not found then raise exception 'Claim de revisión IA inválido o expirado'; end if;
end; $$;
revoke all on function public.intranet_claim_worker_ai_review(uuid,boolean),public.intranet_assert_worker_ai_review_claim(uuid,uuid),public.intranet_complete_worker_ai_review_claim(uuid,uuid) from public;
grant execute on function public.intranet_claim_worker_ai_review(uuid,boolean),public.intranet_assert_worker_ai_review_claim(uuid,uuid),public.intranet_complete_worker_ai_review_claim(uuid,uuid) to service_role;
