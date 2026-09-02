-- Sprint 45: cursor estable para la cola de verificación.
create index if not exists profiles_identity_status_submitted_id_idx
  on public.profiles (identity_status, identity_submitted_at, id);
