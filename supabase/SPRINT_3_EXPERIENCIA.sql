-- ZOVIT Sprint 3: Experiencia profesional verificable
-- Ejecutar en Supabase SQL Editor o: supabase db query --linked -f supabase/SPRINT_3_EXPERIENCIA.sql

alter table public.profiles
  add column if not exists experience_level text not null default 'junior'
    check (experience_level in ('junior', 'verified', 'expert')),
  add column if not exists public_profile boolean not null default true;

create table if not exists public.professional_experience (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid not null unique references public.solicitudes_de_servicio(id) on delete cascade,
  category text not null,
  service_summary text not null,
  completed_at timestamptz not null,
  hours_worked numeric(6,2) not null check (hours_worked > 0),
  client_display_name text not null default 'Cliente verificado',
  verified boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.service_ratings (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.solicitudes_de_servicio(id) on delete cascade,
  professional_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(trim(comment)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists professional_experience_professional_idx
  on public.professional_experience(professional_id, completed_at desc);
create index if not exists service_ratings_professional_idx
  on public.service_ratings(professional_id, created_at desc);

alter table public.professional_experience enable row level security;
alter table public.service_ratings enable row level security;

drop policy if exists "experience_select_public" on public.professional_experience;
create policy "experience_select_public"
  on public.professional_experience for select to anon, authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = professional_id
        and p.role = 'professional'
        and coalesce(p.public_profile, true) = true
    )
    or professional_id = auth.uid()
  );

drop policy if exists "experience_select_own" on public.professional_experience;
create policy "experience_select_own"
  on public.professional_experience for select to authenticated
  using (professional_id = auth.uid());

drop policy if exists "ratings_select_public" on public.service_ratings;
create policy "ratings_select_public"
  on public.service_ratings for select to anon, authenticated
  using (true);

drop policy if exists "ratings_insert_client" on public.service_ratings;
create policy "ratings_insert_client"
  on public.service_ratings for insert to authenticated
  with check (
    client_id = auth.uid()
    and exists (
      select 1 from public.solicitudes_de_servicio r
      where r.id = request_id
        and r.client_id = auth.uid()
        and r.status = 'finalizada'
        and r.professional_id = professional_id
    )
  );

drop policy if exists "profiles_public_professional_select" on public.profiles;
create policy "profiles_public_professional_select"
  on public.profiles for select to anon, authenticated
  using (
    role = 'professional'
    and coalesce(public_profile, true) = true
  );

create or replace function public.refresh_professional_experience_level(p_professional_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare job_count integer;
begin
  select count(*) into job_count
  from public.professional_experience
  where professional_id = p_professional_id;

  update public.profiles
  set experience_level = case
    when job_count >= 20 then 'expert'
    when job_count >= 5 then 'verified'
    else 'junior'
  end,
  updated_at = now()
  where id = p_professional_id;
end;
$$;

create or replace function public.register_verified_experience()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hours numeric;
  client_name text;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if old.status = new.status or new.status <> 'finalizada' or new.professional_id is null then
    return new;
  end if;

  if exists (select 1 from public.professional_experience where request_id = new.id) then
    return new;
  end if;

  hours := greatest(
    1,
    round(extract(epoch from (coalesce(new.updated_at, now()) - coalesce(new.created_at, now()))) / 3600.0, 2)
  );

  select coalesce(nullif(trim(p.first_name), ''), 'Cliente verificado')
  into client_name
  from public.profiles p
  where p.id = new.client_id;

  insert into public.professional_experience (
    professional_id,
    request_id,
    category,
    service_summary,
    completed_at,
    hours_worked,
    client_display_name
  ) values (
    new.professional_id,
    new.id,
    coalesce(new.category, 'Servicio'),
    coalesce(new.description, 'Trabajo completado en ZOVIT'),
    coalesce(new.updated_at, now()),
    hours,
    client_name
  );

  perform public.refresh_professional_experience_level(new.professional_id);
  return new;
end;
$$;

drop trigger if exists register_verified_experience on public.solicitudes_de_servicio;
create trigger register_verified_experience
  after update on public.solicitudes_de_servicio
  for each row execute function public.register_verified_experience();

create or replace function public.submit_service_rating(
  p_request_id uuid,
  p_rating smallint,
  p_comment text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.solicitudes_de_servicio%rowtype;
begin
  if p_rating < 1 or p_rating > 5 then
    raise exception 'La calificación debe estar entre 1 y 5';
  end if;

  select * into r
  from public.solicitudes_de_servicio
  where id = p_request_id;

  if not found then
    raise exception 'Solicitud no encontrada';
  end if;

  if r.client_id <> auth.uid() then
    raise exception 'Solo el cliente puede calificar este servicio';
  end if;

  if r.status <> 'finalizada' or r.professional_id is null then
    raise exception 'Solo puedes calificar trabajos finalizados';
  end if;

  if exists (select 1 from public.service_ratings where request_id = p_request_id) then
    raise exception 'Esta solicitud ya fue calificada';
  end if;

  insert into public.service_ratings (request_id, professional_id, client_id, rating, comment)
  values (p_request_id, r.professional_id, auth.uid(), p_rating, nullif(trim(p_comment), ''));

  insert into public.notifications (user_id, request_id, title, body)
  values (
    r.professional_id,
    r.id,
    'Nueva calificación',
    'Recibiste una calificación de ' || p_rating || ' estrellas en ' || coalesce(r.category, 'tu trabajo')
  );
end;
$$;

create or replace function public.get_professional_stats(p_professional_id uuid)
returns table (
  completed_jobs bigint,
  total_hours numeric,
  average_rating numeric,
  rating_count bigint,
  experience_level text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.professional_experience e where e.professional_id = p_professional_id),
    coalesce((select sum(e.hours_worked) from public.professional_experience e where e.professional_id = p_professional_id), 0),
    coalesce((select round(avg(r.rating)::numeric, 1) from public.service_ratings r where r.professional_id = p_professional_id), 0),
    (select count(*) from public.service_ratings r where r.professional_id = p_professional_id),
    coalesce((select p.experience_level from public.profiles p where p.id = p_professional_id), 'junior');
$$;

insert into public.professional_experience (
  professional_id,
  request_id,
  category,
  service_summary,
  completed_at,
  hours_worked,
  client_display_name
)
select
  r.professional_id,
  r.id,
  coalesce(r.category, 'Servicio'),
  coalesce(r.description, 'Trabajo completado en ZOVIT'),
  coalesce(r.updated_at, r.created_at, now()),
  greatest(1, round(extract(epoch from (coalesce(r.updated_at, now()) - coalesce(r.created_at, now()))) / 3600.0, 2)),
  coalesce(nullif(trim(c.first_name), ''), 'Cliente verificado')
from public.solicitudes_de_servicio r
left join public.profiles c on c.id = r.client_id
where r.status = 'finalizada'
  and r.professional_id is not null
  and not exists (
    select 1 from public.professional_experience e where e.request_id = r.id
  );

do $$
declare rec record;
begin
  for rec in select distinct professional_id from public.professional_experience loop
    perform public.refresh_professional_experience_level(rec.professional_id);
  end loop;
end $$;

grant select on public.professional_experience to anon, authenticated;
grant select on public.service_ratings to anon, authenticated;
grant insert on public.service_ratings to authenticated;
grant execute on function public.submit_service_rating(uuid, smallint, text) to authenticated;
grant execute on function public.get_professional_stats(uuid) to anon, authenticated;
