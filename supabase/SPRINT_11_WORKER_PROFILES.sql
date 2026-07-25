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
