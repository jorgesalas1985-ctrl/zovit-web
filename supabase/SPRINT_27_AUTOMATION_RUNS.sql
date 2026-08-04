-- Sprint 27: persistencia de corridas automaticas.
-- Este sprint prepara auditoria operacional para cron, ticker y ejecuciones manuales.
-- No ejecuta automatizaciones; solo define donde archivar resultados ya calculados.

create table if not exists public.operational_automation_runs (
  id uuid primary key default gen_random_uuid(),
  run_key text not null unique,
  ran_at timestamptz not null,
  trigger_source text not null
    check (trigger_source in ('cron', 'manual', 'ticker', 'system')),
  status text not null
    check (status in ('clean', 'attention_required', 'error')),
  operational_priority text not null default 'normal'
    check (operational_priority in ('normal', 'attention', 'urgent')),
  primary_source text,
  next_action text not null default '',
  openai_configured boolean not null default false,
  executed_actions integer not null default 0 check (executed_actions >= 0),
  document_actions integer not null default 0 check (document_actions >= 0),
  automation_errors integer not null default 0 check (automation_errors >= 0),
  human_review_required integer not null default 0 check (human_review_required >= 0),
  error_sources text[] not null default '{}'::text[],
  human_review_sources text[] not null default '{}'::text[],
  recommendation text not null default '',
  summary jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists operational_automation_runs_ran_at_idx
  on public.operational_automation_runs (ran_at desc);

create index if not exists operational_automation_runs_status_idx
  on public.operational_automation_runs (status, ran_at desc);

create index if not exists operational_automation_runs_priority_idx
  on public.operational_automation_runs (operational_priority, ran_at desc);

create index if not exists operational_automation_runs_trigger_idx
  on public.operational_automation_runs (trigger_source, ran_at desc);

alter table public.operational_automation_runs enable row level security;

drop policy if exists operational_automation_runs_admin_select
  on public.operational_automation_runs;
create policy operational_automation_runs_admin_select
  on public.operational_automation_runs for select to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.intranet_role in ('hr_admin', 'super_admin')
    )
  );

drop policy if exists operational_automation_runs_admin_insert
  on public.operational_automation_runs;
create policy operational_automation_runs_admin_insert
  on public.operational_automation_runs for insert to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.intranet_role in ('hr_admin', 'super_admin')
    )
  );

comment on table public.operational_automation_runs is
  'Historial persistente de corridas automaticas ZOVIT, incluyendo resumen ejecutivo y payload completo.';
