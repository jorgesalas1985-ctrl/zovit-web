-- ZOVIT Sprint 6: Intranet RR.HH. (base)
-- Ejecutar en Supabase SQL Editor después de SPRINT_5_PAGOS.sql

alter table public.profiles
  add column if not exists intranet_role text
  check (intranet_role is null or intranet_role in ('worker', 'supervisor', 'hr_admin', 'super_admin'));

comment on column public.profiles.intranet_role is
  'Rol interno ZOVIT: worker, supervisor, hr_admin, super_admin. Null = sin acceso intranet.';

create table if not exists public.intranet_employee_files (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  employee_code text,
  department text,
  job_title text,
  hire_date date,
  contract_type text,
  emergency_contact_name text,
  emergency_contact_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.intranet_payrolls (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  period_label text not null,
  period_start date not null,
  period_end date not null,
  gross_amount numeric(12,2) not null,
  net_amount numeric(12,2) not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'paid')),
  document_url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists intranet_payrolls_profile_idx
  on public.intranet_payrolls(profile_id, period_start desc);

create table if not exists public.intranet_benefits (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  benefit_name text not null,
  benefit_type text,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Vista demo para super admin (fase posterior con datos reales)
create table if not exists public.intranet_financial_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_month date not null,
  revenue numeric(14,2) not null default 0,
  payroll_cost numeric(14,2) not null default 0,
  operating_cost numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.intranet_employee_files enable row level security;
alter table public.intranet_payrolls enable row level security;
alter table public.intranet_benefits enable row level security;
alter table public.intranet_financial_snapshots enable row level security;

create or replace function public.current_intranet_role()
returns text language sql stable security definer set search_path = public as $$
  select intranet_role from public.profiles where id = auth.uid();
$$;

grant execute on function public.current_intranet_role() to authenticated;

-- Lectura propia
drop policy if exists "intranet_files_select_own" on public.intranet_employee_files;
create policy "intranet_files_select_own" on public.intranet_employee_files
  for select to authenticated using (profile_id = auth.uid());

drop policy if exists "intranet_payrolls_select_own" on public.intranet_payrolls;
create policy "intranet_payrolls_select_own" on public.intranet_payrolls
  for select to authenticated using (profile_id = auth.uid());

drop policy if exists "intranet_benefits_select_own" on public.intranet_benefits;
create policy "intranet_benefits_select_own" on public.intranet_benefits
  for select to authenticated using (profile_id = auth.uid());

-- RR.HH. y super admin
drop policy if exists "intranet_hr_manage_payrolls" on public.intranet_payrolls;
create policy "intranet_hr_manage_payrolls" on public.intranet_payrolls
  for all to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.intranet_role in ('hr_admin', 'super_admin')
    )
  ) with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.intranet_role in ('hr_admin', 'super_admin')
    )
  );

drop policy if exists "intranet_hr_view_files" on public.intranet_employee_files;
create policy "intranet_hr_view_files" on public.intranet_employee_files
  for select to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.intranet_role in ('hr_admin', 'super_admin', 'supervisor')
    )
  );

drop policy if exists "intranet_finance_super_admin" on public.intranet_financial_snapshots;
create policy "intranet_finance_super_admin" on public.intranet_financial_snapshots
  for all to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.intranet_role = 'super_admin'
    )
  ) with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.intranet_role = 'super_admin'
    )
  );

-- Ejemplo: asignarte super admin (reemplaza el UUID por tu user id)
-- update public.profiles set intranet_role = 'super_admin' where id = '7375e428-2a6a-447b-b87e-1ac8c78f5757';
