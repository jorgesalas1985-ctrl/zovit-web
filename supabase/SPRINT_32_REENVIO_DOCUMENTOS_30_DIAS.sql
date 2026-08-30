-- Plazo de corrección documental: 30 días desde que administración solicita el reenvío.
alter table public.profiles
  add column if not exists identity_resubmission_due_at timestamptz,
  add column if not exists identity_resubmission_suspended_at timestamptz;

create index if not exists profiles_identity_resubmission_due_idx
  on public.profiles (identity_resubmission_due_at)
  where identity_resubmission_due_at is not null;

comment on column public.profiles.identity_resubmission_due_at is
  'Fecha límite para reenviar documentos observados por ZOVIT.';
comment on column public.profiles.identity_resubmission_suspended_at is
  'Momento en que se bloqueó el acceso hasta completar la corrección documental.';
