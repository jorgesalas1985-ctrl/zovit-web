-- Configuración central de tarifas automáticas. Solo se administra mediante la API de superadmin.
create table if not exists public.platform_work_pricing (
  id boolean primary key default true check (id),
  professional_day_net integer not null default 30000 check (professional_day_net >= 20000),
  minimum_day_net integer not null default 20000 check (minimum_day_net >= 20000),
  day_hours numeric(4,2) not null default 8 check (day_hours > 0 and day_hours <= 24),
  additional_hour_net integer not null default 3750 check (additional_hour_net >= 0),
  additional_hour_surcharge_percent numeric(5,2) not null default 50 check (additional_hour_surcharge_percent >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

insert into public.platform_work_pricing (id)
values (true)
on conflict (id) do nothing;

alter table public.platform_work_pricing enable row level security;
revoke all on public.platform_work_pricing from anon, authenticated;
grant select, insert, update on public.platform_work_pricing to service_role;

comment on table public.platform_work_pricing is
  'Parámetros comerciales automáticos de ZOVIT. El recargo de hora adicional es configurable; no sustituye una evaluación laboral o tributaria.';
