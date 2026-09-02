-- Sprint 46: cursores persistentes para batches de cumplimiento documental.
create index if not exists profiles_worker_registration_created_id_idx
  on public.profiles (worker_registration_status, created_at, id);

create table if not exists public.operational_batch_cursors (
  workflow text primary key check (workflow in ('document_reminders', 'document_suspensions', 'document_notification_cleanup')),
  cursor_created_at timestamptz,
  cursor_profile_id uuid,
  updated_at timestamptz not null default now()
);
alter table public.operational_batch_cursors enable row level security;
revoke all privileges on table public.operational_batch_cursors from public, anon, authenticated;

create or replace function public.intranet_get_operational_batch_cursor(p_workflow text)
returns table(cursor_created_at timestamptz, cursor_profile_id uuid) language sql security definer set search_path = public, pg_temp as $$
  select c.cursor_created_at, c.cursor_profile_id from public.operational_batch_cursors c where c.workflow = p_workflow;
$$;

create or replace function public.intranet_advance_operational_batch_cursor(
  p_workflow text, p_cursor_created_at timestamptz default null, p_cursor_profile_id uuid default null
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.operational_batch_cursors as c (workflow, cursor_created_at, cursor_profile_id, updated_at)
  values (p_workflow, p_cursor_created_at, p_cursor_profile_id, now())
  on conflict (workflow) do update set cursor_created_at = excluded.cursor_created_at,
    cursor_profile_id = excluded.cursor_profile_id, updated_at = now();
end;
$$;
revoke all on function public.intranet_get_operational_batch_cursor(text) from public;
revoke all on function public.intranet_advance_operational_batch_cursor(text, timestamptz, uuid) from public;
grant execute on function public.intranet_get_operational_batch_cursor(text) to service_role;
grant execute on function public.intranet_advance_operational_batch_cursor(text, timestamptz, uuid) to service_role;
