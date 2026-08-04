-- Sprint 25: persistencia operacional inicial.
-- Este sprint prepara historial para snapshots, manifiestos, cierres semestrales y eventos auditables.
-- No reemplaza la logica de dominio en TypeScript; solo agrega soporte persistente.

create table if not exists public.operational_snapshots (
  id uuid primary key default gen_random_uuid(),
  archive_key text not null unique,
  schema_name text not null,
  schema_version text not null,
  generated_at timestamptz not null,
  source text not null,
  cadence text not null
    check (cadence in ('daily', 'weekly', 'semester_close', 'manual')),
  health_status text not null,
  health_score integer not null check (health_score >= 0 and health_score <= 100),
  total_profiles integer not null default 0 check (total_profiles >= 0),
  total_items integer not null default 0 check (total_items >= 0),
  critical_items integer not null default 0 check (critical_items >= 0),
  human_actions integer not null default 0 check (human_actions >= 0),
  blocked_actions integer not null default 0 check (blocked_actions >= 0),
  retention_tier text not null
    check (retention_tier in ('short_term', 'semester', 'annual', 'founder_archive')),
  retain_until date,
  should_persist boolean not null default true,
  snapshot jsonb not null default '{}'::jsonb,
  manifest jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists operational_snapshots_generated_idx
  on public.operational_snapshots (generated_at desc);

create index if not exists operational_snapshots_schema_idx
  on public.operational_snapshots (schema_version, generated_at desc);

create index if not exists operational_snapshots_health_idx
  on public.operational_snapshots (health_status, generated_at desc);

create index if not exists operational_snapshots_retention_idx
  on public.operational_snapshots (retention_tier, retain_until);

alter table public.operational_snapshots enable row level security;

drop policy if exists operational_snapshots_admin_select on public.operational_snapshots;
create policy operational_snapshots_admin_select
  on public.operational_snapshots for select to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.intranet_role in ('hr_admin', 'super_admin')
    )
  );

drop policy if exists operational_snapshots_admin_insert on public.operational_snapshots;
create policy operational_snapshots_admin_insert
  on public.operational_snapshots for insert to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.intranet_role in ('hr_admin', 'super_admin')
    )
  );

create table if not exists public.semester_close_records (
  id uuid primary key default gen_random_uuid(),
  year integer not null check (year >= 2026),
  semester text not null check (semester in ('S1', 'S2')),
  starts_at date not null,
  ends_at date not null,
  status text not null
    check (status in ('ready', 'ready_with_observations', 'blocked', 'insufficient_data')),
  can_close boolean not null default false,
  requires_superadmin_review boolean not null default false,
  target jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  decision jsonb not null default '{}'::jsonb,
  report jsonb not null default '{}'::jsonb,
  action_summary jsonb not null default '{}'::jsonb,
  execution_policy jsonb not null default '{}'::jsonb,
  audit_trail jsonb not null default '{}'::jsonb,
  snapshot_id uuid references public.operational_snapshots(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (year, semester)
);

create index if not exists semester_close_records_period_idx
  on public.semester_close_records (year desc, semester);

create index if not exists semester_close_records_status_idx
  on public.semester_close_records (status, created_at desc);

alter table public.semester_close_records enable row level security;

drop policy if exists semester_close_records_admin_select on public.semester_close_records;
create policy semester_close_records_admin_select
  on public.semester_close_records for select to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.intranet_role in ('hr_admin', 'super_admin')
    )
  );

drop policy if exists semester_close_records_admin_insert on public.semester_close_records;
create policy semester_close_records_admin_insert
  on public.semester_close_records for insert to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.intranet_role in ('hr_admin', 'super_admin')
    )
  );

create table if not exists public.operational_audit_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  event_scope text not null
    check (event_scope in ('operational_snapshot', 'semester_close')),
  event_type text not null,
  actor_type text not null,
  title text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  operational_snapshot_id uuid references public.operational_snapshots(id) on delete cascade,
  semester_close_record_id uuid references public.semester_close_records(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists operational_audit_events_scope_idx
  on public.operational_audit_events (event_scope, created_at desc);

create index if not exists operational_audit_events_type_idx
  on public.operational_audit_events (event_type, created_at desc);

alter table public.operational_audit_events enable row level security;

drop policy if exists operational_audit_events_admin_select on public.operational_audit_events;
create policy operational_audit_events_admin_select
  on public.operational_audit_events for select to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.intranet_role in ('hr_admin', 'super_admin')
    )
  );

drop policy if exists operational_audit_events_admin_insert on public.operational_audit_events;
create policy operational_audit_events_admin_insert
  on public.operational_audit_events for insert to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.intranet_role in ('hr_admin', 'super_admin')
    )
  );

comment on table public.operational_snapshots is
  'Historial persistente de snapshots operacionales ZOVIT y sus manifiestos.';

comment on table public.semester_close_records is
  'Registro formal de cierres semestrales ZOVIT calculados desde snapshots/manifiestos.';

comment on table public.operational_audit_events is
  'Eventos auditables asociados a snapshots operacionales y cierres semestrales.';
