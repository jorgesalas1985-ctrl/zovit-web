-- Parámetros editables del cálculo de combustible a domicilio.
-- La integración Google Routes + Places consumirá estos valores al cotizar una nueva solicitud.
alter table public.platform_work_pricing
  add column if not exists fuel_base_fare integer not null default 4000 check (fuel_base_fare >= 0),
  add column if not exists fuel_day_km_rate integer not null default 600 check (fuel_day_km_rate >= 0),
  add column if not exists fuel_night_km_rate integer not null default 800 check (fuel_night_km_rate >= 0),
  add column if not exists fuel_high_demand_km_rate integer not null default 1000 check (fuel_high_demand_km_rate >= 0),
  add column if not exists fuel_minute_rate integer not null default 100 check (fuel_minute_rate >= 0),
  add column if not exists fuel_night_starts_at smallint not null default 22 check (fuel_night_starts_at between 0 and 23),
  add column if not exists fuel_night_ends_at smallint not null default 7 check (fuel_night_ends_at between 0 and 23);

comment on column public.platform_work_pricing.fuel_base_fare is
  'Mínimo comercial del traslado de combustible. El combustible comprado se cobra por separado.';
