-- SPRINT 21: revisión automática de carnet (OCR IA)

alter table public.profiles
  add column if not exists identity_ai_status text
    check (identity_ai_status in ('pending', 'processing', 'approved', 'rejected', 'dudoso'));

alter table public.profiles
  add column if not exists identity_ai_at timestamptz;

alter table public.profiles
  add column if not exists identity_ai_summary text;

alter table public.profiles
  add column if not exists identity_ai_confidence numeric(5,4);

alter table public.profiles
  add column if not exists identity_ai_forgery_risk text
    check (identity_ai_forgery_risk in ('low', 'medium', 'high'));

alter table public.profiles
  add column if not exists identity_ai_extracted_rut text;

alter table public.profiles
  add column if not exists identity_ai_extracted_birth_date date;

comment on column public.profiles.identity_ai_status is
  'Resultado de OCR/IA del carnet: approved/rejected/dudoso/processing/pending.';

create index if not exists profiles_identity_ai_pending_idx
  on public.profiles (identity_status, identity_ai_status)
  where identity_status = 'pending';
