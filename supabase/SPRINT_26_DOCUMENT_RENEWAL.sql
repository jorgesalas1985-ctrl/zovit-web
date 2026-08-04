-- Sprint 26: persistencia documental semestral.
-- Registra documentos operativos como evidencia y eventos reutilizables por renovacion, OCR y revision.

create table if not exists public.operational_documents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  document_kind text not null
    check (document_kind in ('identity', 'credential', 'license', 'student_enrollment', 'background', 'other')),
  storage_bucket text not null,
  storage_path text not null,
  original_name text,
  mime_type text,
  file_size_bytes integer check (file_size_bytes is null or file_size_bytes >= 0),
  status text not null default 'submitted'
    check (status in ('submitted', 'ocr_pending', 'ocr_completed', 'needs_manual_review', 'approved', 'rejected', 'expired', 'replaced')),
  semester_year integer not null check (semester_year >= 2026),
  semester text not null check (semester in ('S1', 'S2')),
  extracted_data jsonb not null default '{}'::jsonb,
  validation_summary jsonb not null default '{}'::jsonb,
  ocr_engine text,
  ocr_processed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  replaced_by uuid references public.operational_documents(id) on delete set null,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, document_kind, semester_year, semester, storage_path)
);

create index if not exists operational_documents_profile_idx
  on public.operational_documents (profile_id, semester_year desc, semester);

create index if not exists operational_documents_status_idx
  on public.operational_documents (status, submitted_at desc);

create index if not exists operational_documents_semester_idx
  on public.operational_documents (semester_year desc, semester, document_kind);

alter table public.operational_documents enable row level security;

drop policy if exists operational_documents_select_own on public.operational_documents;
create policy operational_documents_select_own
  on public.operational_documents for select to authenticated
  using (profile_id = auth.uid());

drop policy if exists operational_documents_insert_own on public.operational_documents;
create policy operational_documents_insert_own
  on public.operational_documents for insert to authenticated
  with check (profile_id = auth.uid());

drop policy if exists operational_documents_admin_select on public.operational_documents;
create policy operational_documents_admin_select
  on public.operational_documents for select to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.intranet_role in ('hr_admin', 'supervisor', 'super_admin')
    )
  );

drop policy if exists operational_documents_admin_update on public.operational_documents;
create policy operational_documents_admin_update
  on public.operational_documents for update to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.intranet_role in ('hr_admin', 'supervisor', 'super_admin')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.intranet_role in ('hr_admin', 'supervisor', 'super_admin')
    )
  );

create table if not exists public.operational_document_events (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.operational_documents(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null
    check (event_type in ('submitted', 'replaced', 'ocr_requested', 'ocr_completed', 'manual_review_requested', 'approved', 'rejected', 'expired', 'semester_renewal_reminder', 'semester_suspension_ready', 'post_decision_sync_failed')),
  semester_year integer not null check (semester_year >= 2026),
  semester text not null check (semester in ('S1', 'S2')),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_type text not null default 'system'
    check (actor_type in ('user', 'operations', 'supervisor', 'superadmin', 'system')),
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists operational_document_events_profile_idx
  on public.operational_document_events (profile_id, created_at desc);

create index if not exists operational_document_events_document_idx
  on public.operational_document_events (document_id, created_at desc);

create index if not exists operational_document_events_type_idx
  on public.operational_document_events (event_type, created_at desc);

alter table public.operational_document_events enable row level security;

drop policy if exists operational_document_events_select_own on public.operational_document_events;
create policy operational_document_events_select_own
  on public.operational_document_events for select to authenticated
  using (profile_id = auth.uid());

drop policy if exists operational_document_events_admin_all on public.operational_document_events;
create policy operational_document_events_admin_all
  on public.operational_document_events for all to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.intranet_role in ('hr_admin', 'supervisor', 'super_admin')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.intranet_role in ('hr_admin', 'supervisor', 'super_admin')
    )
  );

comment on table public.operational_documents is
  'Documentos operativos semestrales usados como evidencia estructurada para renovacion, OCR y revision.';

comment on table public.operational_document_events is
  'Eventos auditables del ciclo documental operacional por semestre.';
