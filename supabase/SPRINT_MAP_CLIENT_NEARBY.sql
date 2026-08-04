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
