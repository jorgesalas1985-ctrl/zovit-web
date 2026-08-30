-- ARCHIVO: SPRINT_11_WORKER_PROFILES.sql

-- Sprint 11: perfiles de servicio para trabajadores (ADITIVO, no destructivo).
-- No elimina columnas ni tablas existentes. Seguro de ejecutar sobre datos actuales.

-- Columns on profiles (nullable / defaults preserve existing rows)
alter table public.profiles
  add column if not exists birth_date date,
  add column if not exists worker_registration_status text not null default 'draft',
  add column if not exists primary_service_profile text,
  add column if not exists worker_consent_at timestamptz,
  add column if not exists worker_consent_version text,
  add column if not exists worker_admin_notes text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_worker_registration_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_worker_registration_status_check
      check (worker_registration_status in (
        'draft', 'incomplete', 'submitted', 'needs_info',
        'verified', 'partially_verified', 'rejected', 'suspended', 'document_expired'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_primary_service_profile_check'
  ) then
    alter table public.profiles
      add constraint profiles_primary_service_profile_check
      check (
        primary_service_profile is null
        or primary_service_profile in (
          'certified', 'experience_verified', 'in_training', 'community_collaborator'
        )
      );
  end if;
end $$;

-- Full registration payload (autosave + review)
create table if not exists public.worker_registrations (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  draft jsonb not null default '{}'::jsonb,
  suggested_profiles text[] not null default '{}',
  status text not null default 'draft',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  review_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint worker_registrations_status_check check (status in (
    'draft', 'incomplete', 'submitted', 'needs_info',
    'verified', 'partially_verified', 'rejected', 'suspended', 'document_expired'
  ))
);

create table if not exists public.worker_credentials (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  profession text,
  institution text,
  credential_name text,
  year_obtained integer,
  registry_number text,
  expires_at date,
  status text not null default 'pending',
  storage_path text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint worker_credentials_status_check check (
    status in ('pending', 'verified', 'rejected', 'expired')
  )
);

create table if not exists public.worker_service_authorizations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  category_slug text not null,
  specialty_slug text not null,
  specialty_name text,
  requires_credential boolean not null default false,
  authorization_status text not null default 'pending',
  linked_credential_id uuid references public.worker_credentials(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, specialty_slug),
  constraint worker_service_auth_status_check check (
    authorization_status in ('blocked', 'pending', 'authorized', 'revoked')
  )
);

create table if not exists public.worker_review_history (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.worker_public_badges (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  badge_key text not null,
  meta jsonb not null default '{}'::jsonb,
  granted_at timestamptz not null default now(),
  granted_by uuid references public.profiles(id),
  unique (profile_id, badge_key)
);

create index if not exists worker_registrations_status_idx
  on public.worker_registrations (status);
create index if not exists worker_credentials_profile_idx
  on public.worker_credentials (profile_id);
create index if not exists worker_service_auth_profile_idx
  on public.worker_service_authorizations (profile_id);
create index if not exists worker_review_history_profile_idx
  on public.worker_review_history (profile_id, created_at desc);

alter table public.worker_registrations enable row level security;
alter table public.worker_credentials enable row level security;
alter table public.worker_service_authorizations enable row level security;
alter table public.worker_review_history enable row level security;
alter table public.worker_public_badges enable row level security;

-- Owner policies
drop policy if exists worker_registrations_owner on public.worker_registrations;
create policy worker_registrations_owner on public.worker_registrations
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

drop policy if exists worker_credentials_owner on public.worker_credentials;
create policy worker_credentials_owner on public.worker_credentials
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

drop policy if exists worker_service_auth_owner_select on public.worker_service_authorizations;
create policy worker_service_auth_owner_select on public.worker_service_authorizations
  for select using (auth.uid() = profile_id);

drop policy if exists worker_service_auth_owner_write on public.worker_service_authorizations;
create policy worker_service_auth_owner_write on public.worker_service_authorizations
  for insert with check (auth.uid() = profile_id);

drop policy if exists worker_service_auth_owner_update on public.worker_service_authorizations;
create policy worker_service_auth_owner_update on public.worker_service_authorizations
  for update using (auth.uid() = profile_id);

drop policy if exists worker_badges_public_read on public.worker_public_badges;
create policy worker_badges_public_read on public.worker_public_badges
  for select using (true);

drop policy if exists worker_badges_owner on public.worker_public_badges;
create policy worker_badges_owner on public.worker_public_badges
  for select using (auth.uid() = profile_id);

-- Intranet reviewers (hr_admin / super_admin)
drop policy if exists worker_registrations_intranet on public.worker_registrations;
create policy worker_registrations_intranet on public.worker_registrations
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.intranet_role in ('hr_admin', 'super_admin')
    )
  );

drop policy if exists worker_credentials_intranet on public.worker_credentials;
create policy worker_credentials_intranet on public.worker_credentials
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.intranet_role in ('hr_admin', 'super_admin')
    )
  );

drop policy if exists worker_service_auth_intranet on public.worker_service_authorizations;
create policy worker_service_auth_intranet on public.worker_service_authorizations
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.intranet_role in ('hr_admin', 'super_admin')
    )
  );

drop policy if exists worker_review_history_intranet on public.worker_review_history;
create policy worker_review_history_intranet on public.worker_review_history
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.intranet_role in ('hr_admin', 'super_admin')
    )
  );

drop policy if exists worker_review_history_owner_select on public.worker_review_history;
create policy worker_review_history_owner_select on public.worker_review_history
  for select using (auth.uid() = profile_id);

comment on table public.worker_registrations is
  'Borrador y estado del registro de trabajadores / perfiles de servicio ZOVIT.';
comment on table public.worker_credentials is
  'Títulos, licencias y certificaciones con estado de validación.';
comment on table public.worker_service_authorizations is
  'Autorización por especialidad; servicios regulados pueden quedar bloqueados.';

grant select, insert, update, delete on table public.worker_registrations to authenticated;
grant select, insert, update, delete on table public.worker_credentials to authenticated;
grant select, insert, update, delete on table public.worker_service_authorizations to authenticated;
grant select on table public.worker_review_history to authenticated;
grant insert on table public.worker_review_history to authenticated;
grant select on table public.worker_public_badges to authenticated, anon;
grant select, insert, update, delete on table public.worker_registrations to service_role;
grant select, insert, update, delete on table public.worker_credentials to service_role;
grant select, insert, update, delete on table public.worker_service_authorizations to service_role;
grant select, insert, update, delete on table public.worker_review_history to service_role;
grant select, insert, update, delete on table public.worker_public_badges to service_role;




-- ARCHIVO: SPRINT_12_WORKER_AI_VALIDATION.sql

-- Sprint 12: documentos de trabajadores + cola de validación IA
-- Aditivo. Ejecutar en SQL Editor de Supabase.

-- Columnas de seguimiento IA en el registro
alter table public.worker_registrations
  add column if not exists ai_review_status text
    check (
      ai_review_status is null
      or ai_review_status in ('pending', 'processing', 'approved', 'rejected', 'dudoso')
    ),
  add column if not exists ai_review_at timestamptz,
  add column if not exists ai_review_summary text,
  add column if not exists ai_confidence numeric(4, 3),
  add column if not exists ai_forgery_risk text
    check (
      ai_forgery_risk is null
      or ai_forgery_risk in ('low', 'medium', 'high')
    );

alter table public.worker_credentials
  add column if not exists document_mime text,
  add column if not exists ai_notes text,
  add column if not exists ai_forgery_risk text
    check (
      ai_forgery_risk is null
      or ai_forgery_risk in ('low', 'medium', 'high')
    );

comment on column public.worker_registrations.ai_review_status is
  'Resultado de validación automática: approved | rejected | dudoso | pending | processing';

-- Bucket privado para certificados / licencias / matrículas
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'worker-credentials',
  'worker-credentials',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/json']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists worker_credentials_storage_select on storage.objects;
create policy worker_credentials_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'worker-credentials'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.intranet_role in ('hr_admin', 'super_admin')
      )
    )
  );

drop policy if exists worker_credentials_storage_insert on storage.objects;
create policy worker_credentials_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'worker-credentials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists worker_credentials_storage_update on storage.objects;
create policy worker_credentials_storage_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'worker-credentials'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.intranet_role in ('hr_admin', 'super_admin')
      )
    )
  );

drop policy if exists worker_credentials_storage_delete on storage.objects;
create policy worker_credentials_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'worker-credentials'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.intranet_role in ('hr_admin', 'super_admin')
      )
    )
  );

-- Al enviar a revisión, marcar cola IA pendiente si aún no hay veredicto
-- (la app también lo setea; esto es respaldo opcional vía trigger no incluido).




-- ARCHIVO: SEG-002-RLS-SECURITY.sql

-- SEG-002: hardening menor y seguro para RLS, ownership y storage.
-- Idempotente: usa create policy if not exists cuando es posible y no destruye datos.

-- 1) RLS en tablas sensibles que hoy usan service_role sin ownership real.

alter table public.identity_documents enable row level security;
alter table public.worker_credentials enable row level security;
alter table public.worker_service_authorizations enable row level security;
alter table public.worker_review_history enable row level security;

-- 2) Políticas de ownership para documentos y credenciales.
drop policy if exists identity_documents_owner_select on public.identity_documents;
create policy identity_documents_owner_select on public.identity_documents
  for select using (auth.uid() = profile_id);

drop policy if exists identity_documents_owner_write on public.identity_documents;
create policy identity_documents_owner_write on public.identity_documents
  for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

drop policy if exists identity_documents_owner_insert on public.identity_documents;
create policy identity_documents_owner_insert on public.identity_documents
  for insert with check (auth.uid() = profile_id);

drop policy if exists worker_credentials_owner_select on public.worker_credentials;
create policy worker_credentials_owner_select on public.worker_credentials
  for select using (auth.uid() = profile_id);

drop policy if exists worker_credentials_owner_write on public.worker_credentials;
create policy worker_credentials_owner_write on public.worker_credentials
  for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

drop policy if exists worker_credentials_owner_insert on public.worker_credentials;
create policy worker_credentials_owner_insert on public.worker_credentials
  for insert with check (auth.uid() = profile_id);

drop policy if exists worker_service_authorizations_owner_select on public.worker_service_authorizations;
create policy worker_service_authorizations_owner_select on public.worker_service_authorizations
  for select using (auth.uid() = profile_id);

drop policy if exists worker_service_authorizations_owner_write on public.worker_service_authorizations;
create policy worker_service_authorizations_owner_write on public.worker_service_authorizations
  for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

drop policy if exists worker_service_authorizations_owner_insert on public.worker_service_authorizations;
create policy worker_service_authorizations_owner_insert on public.worker_service_authorizations
  for insert with check (auth.uid() = profile_id);

drop policy if exists worker_review_history_owner_select on public.worker_review_history;
create policy worker_review_history_owner_select on public.worker_review_history
  for select using (auth.uid() = profile_id);

drop policy if exists worker_review_history_owner_insert on public.worker_review_history;
create policy worker_review_history_owner_insert on public.worker_review_history
  for insert with check (auth.uid() = profile_id);

-- 3) Políticas intranet restringidas a hr_admin/super_admin para tablas sensibles.
drop policy if exists identity_documents_intranet_admin on public.identity_documents;
create policy identity_documents_intranet_admin on public.identity_documents
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.intranet_role in ('hr_admin', 'super_admin')
    )
  );

drop policy if exists worker_credentials_intranet_admin on public.worker_credentials;
create policy worker_credentials_intranet_admin on public.worker_credentials
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.intranet_role in ('hr_admin', 'super_admin')
    )
  );

drop policy if exists worker_service_authorizations_intranet_admin on public.worker_service_authorizations;
create policy worker_service_authorizations_intranet_admin on public.worker_service_authorizations
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.intranet_role in ('hr_admin', 'super_admin')
    )
  );

drop policy if exists worker_review_history_intranet_admin on public.worker_review_history;
create policy worker_review_history_intranet_admin on public.worker_review_history
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.intranet_role in ('hr_admin', 'super_admin')
    )
  );

-- 4) Evitar políticas abiertas que permitan lectura a todo el mundo.
-- Se deja el acceso público solo a datos no sensibles; el resto debe filtrarse por ownership.

drop policy if exists worker_public_badges_public_read on public.worker_public_badges;
create policy worker_public_badges_public_read on public.worker_public_badges
  for select using (false);

-- 5) Ajuste de seguridad para funciones RPC sensibles: usar auth.uid() en la función y no confiar en p_user_id recibido por cliente.
-- Este bloque es seguro para aplicar en modo SQL editor, pero no reemplaza una migración completa si la función ya existe.

create or replace function public.request_payout(
  p_amount numeric,
  p_bank_name text,
  p_bank_account_type text,
  p_bank_account_number text,
  p_account_holder_name text,
  p_account_holder_rut text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'No autenticado.';
  end if;

  insert into public.payout_requests (
    user_id,
    amount,
    bank_name,
    bank_account_type,
    bank_account_number,
    account_holder_name,
    account_holder_rut,
    status,
    created_at,
    updated_at
  ) values (
    v_user_id,
    p_amount,
    p_bank_name,
    p_bank_account_type,
    p_bank_account_number,
    p_account_holder_name,
    p_account_holder_rut,
    'pendiente',
    now(),
    now()
  ) returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.request_payout(numeric, text, text, text, text, text) to authenticated;




-- ARCHIVO: SPRINT_MAP_CLIENT_NEARBY.sql

-- =============================================================================
-- SPRINT MAPA CLIENTE — ubicación, solicitudes geolocalizadas, live tracking
-- Ejecutar en Supabase SQL Editor. Idempotente.
-- =============================================================================

alter table public.profiles
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists location_updated_at timestamptz,
  add column if not exists availability_status text default 'offline',
  add column if not exists location_sharing_enabled boolean default false,
  add column if not exists service_radius_km numeric default 10;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_availability_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_availability_status_check
      check (availability_status in ('available', 'busy', 'offline', 'on_the_way'));
  end if;
exception when others then
  null;
end $$;

create index if not exists profiles_geo_idx
  on public.profiles (latitude, longitude)
  where latitude is not null and longitude is not null;

alter table public.solicitudes_de_servicio
  add column if not exists client_latitude double precision,
  add column if not exists client_longitude double precision,
  add column if not exists service_commune text,
  add column if not exists service_region text,
  add column if not exists urgency text default 'normal',
  add column if not exists estimated_budget numeric,
  add column if not exists scheduled_for timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists on_the_way_at timestamptz,
  add column if not exists arrived_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists source text default 'form';

create table if not exists public.service_live_locations (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.solicitudes_de_servicio(id) on delete cascade,
  professional_id uuid not null references public.profiles(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  heading double precision,
  speed double precision,
  accuracy double precision,
  recorded_at timestamptz not null default now(),
  unique (service_id)
);

create index if not exists service_live_locations_service_idx
  on public.service_live_locations (service_id);

alter table public.service_live_locations enable row level security;

drop policy if exists "live_loc_select_parties" on public.service_live_locations;
create policy "live_loc_select_parties"
  on public.service_live_locations for select to authenticated
  using (
    exists (
      select 1 from public.solicitudes_de_servicio s
      where s.id = service_id
        and (s.client_id = auth.uid() or s.professional_id = auth.uid())
        and s.status in ('aceptada', 'en_camino', 'en_ejecucion')
    )
  );

drop policy if exists "live_loc_upsert_professional" on public.service_live_locations;
create policy "live_loc_upsert_professional"
  on public.service_live_locations for insert to authenticated
  with check (
    professional_id = auth.uid()
    and exists (
      select 1 from public.solicitudes_de_servicio s
      where s.id = service_id
        and s.professional_id = auth.uid()
        and s.status in ('aceptada', 'en_camino', 'en_ejecucion')
    )
  );

drop policy if exists "live_loc_update_professional" on public.service_live_locations;
create policy "live_loc_update_professional"
  on public.service_live_locations for update to authenticated
  using (professional_id = auth.uid())
  with check (professional_id = auth.uid());

drop policy if exists "live_loc_delete_parties" on public.service_live_locations;
create policy "live_loc_delete_parties"
  on public.service_live_locations for delete to authenticated
  using (
    professional_id = auth.uid()
    or exists (
      select 1 from public.solicitudes_de_servicio s
      where s.id = service_id and s.client_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.service_live_locations to authenticated;

do $$
begin
  begin
    alter publication supabase_realtime add table public.service_live_locations;
  exception when duplicate_object then
    null;
  end;
end $$;

-- Distancia Haversine (km)
create or replace function public.haversine_km(
  lat1 double precision,
  lng1 double precision,
  lat2 double precision,
  lng2 double precision
)
returns numeric
language sql
immutable
as $$
  select (
    6371 * acos(
      least(1.0, greatest(-1.0,
        cos(radians(lat1)) * cos(radians(lat2))
        * cos(radians(lng2) - radians(lng1))
        + sin(radians(lat1)) * sin(radians(lat2))
      ))
    )
  )::numeric;
$$;

grant execute on function public.haversine_km(double precision, double precision, double precision, double precision)
  to authenticated, anon;

-- Profesionales cercanos (sin dirección exacta)
create or replace function public.search_nearby_professionals(
  p_lat double precision,
  p_lng double precision,
  p_radius_km numeric default 5,
  p_category text default null,
  p_specialty text default null,
  p_min_rating numeric default 0,
  p_verified_only boolean default false,
  p_certified_only boolean default false,
  p_availability text default null,
  p_limit integer default 40
)
returns table (
  id uuid,
  first_name text,
  last_name text,
  avatar_url text,
  commune text,
  experience_level text,
  service_categories text[],
  specialties text[],
  completed_jobs bigint,
  average_rating numeric,
  rating_count bigint,
  identity_verified boolean,
  biometric_verified boolean,
  availability_status text,
  latitude double precision,
  longitude double precision,
  distance_km numeric,
  primary_service_profile text
)
language sql
stable
-- DEFINER: clients must discover other pros' public geo without broad profiles SELECT (SPRINT_18 dropped that policy).
security definer
set search_path = public
as $$
  select
    p.id,
    p.first_name,
    p.last_name,
    p.avatar_url,
    p.commune,
    coalesce(p.experience_level::text, 'junior') as experience_level,
    coalesce(p.service_categories, '{}'::text[]) as service_categories,
    coalesce(p.specialties, '{}'::text[]) as specialties,
    coalesce((
      select count(*)::bigint
      from public.solicitudes_de_servicio req
      where req.professional_id = p.id and req.status = 'finalizada'
    ), 0) as completed_jobs,
    coalesce((
      select round(avg(r.rating)::numeric, 1)
      from public.service_ratings r
      where r.professional_id = p.id
    ), 0) as average_rating,
    coalesce((
      select count(*)::bigint
      from public.service_ratings r
      where r.professional_id = p.id
    ), 0) as rating_count,
    coalesce(p.identity_verified, false) as identity_verified,
    coalesce(p.biometric_verified, false) as biometric_verified,
    coalesce(p.availability_status, 'offline') as availability_status,
    p.latitude,
    p.longitude,
    public.haversine_km(p_lat, p_lng, p.latitude, p.longitude) as distance_km,
    nullif(coalesce(p.primary_service_profile::text, ''), '') as primary_service_profile
  from public.profiles p
  where
    (p.role = 'professional' or coalesce(p.can_act_as_professional, false) = true)
    and coalesce(p.public_profile, true) = true
    and p.latitude is not null
    and p.longitude is not null
    and coalesce(p.availability_status, 'offline') <> 'offline'
    and (p_availability is null or p.availability_status = p_availability)
    and (
      p_category is null or btrim(p_category) = ''
      or exists (
        select 1 from unnest(coalesce(p.service_categories, '{}'::text[])) c
        where lower(c) like '%' || lower(p_category) || '%'
      )
    )
    and (
      p_specialty is null or btrim(p_specialty) = ''
      or exists (
        select 1 from unnest(coalesce(p.specialties, '{}'::text[])) sp
        where lower(sp) like '%' || lower(p_specialty) || '%'
      )
    )
    and (
      not coalesce(p_verified_only, false)
      or coalesce(p.identity_verified, false)
      or coalesce(p.biometric_verified, false)
    )
    and (
      not coalesce(p_certified_only, false)
      or coalesce(p.experience_level::text, '') in ('verified', 'expert')
      or coalesce(p.primary_service_profile::text, '') = 'certified'
    )
    and public.haversine_km(p_lat, p_lng, p.latitude, p.longitude) <= coalesce(p_radius_km, 5)
  order by
    case coalesce(p.availability_status, 'offline')
      when 'available' then 0
      when 'on_the_way' then 1
      when 'busy' then 2
      else 3
    end,
    public.haversine_km(p_lat, p_lng, p.latitude, p.longitude) asc
  limit greatest(1, least(coalesce(p_limit, 40), 80));
$$;

grant execute on function public.search_nearby_professionals(
  double precision, double precision, numeric, text, text, numeric, boolean, boolean, text, integer
) to authenticated;

comment on function public.search_nearby_professionals is
  'Profesionales cercanos para mapa cliente. No expone dirección textual exacta del profesional.';




