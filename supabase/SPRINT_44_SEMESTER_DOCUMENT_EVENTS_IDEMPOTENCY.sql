-- Sprint 44: una sola preparación documental por perfil, tipo y semestre.
create table if not exists public.operational_document_semester_event_keys (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('semester_renewal_reminder', 'semester_suspension_ready')),
  semester_year integer not null check (semester_year >= 2026),
  semester text not null check (semester in ('S1', 'S2')),
  event_id uuid references public.operational_document_events(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (profile_id, event_type, semester_year, semester)
);
alter table public.operational_document_semester_event_keys enable row level security;
revoke all privileges on table public.operational_document_semester_event_keys from public, anon, authenticated;

create or replace function public.intranet_create_semester_document_event(
  p_profile_id uuid, p_event_type text, p_semester_year integer, p_semester text,
  p_actor_id uuid, p_actor_type text, p_summary text, p_metadata jsonb
) returns table(event_id uuid, created boolean) language plpgsql security definer set search_path = public, pg_temp as $$
declare inserted_key boolean := false; row_count integer; new_event_id uuid;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'Acceso no autorizado'; end if;
  if p_event_type not in ('semester_renewal_reminder', 'semester_suspension_ready') then raise exception 'Evento documental inválido'; end if;
  if p_semester not in ('S1', 'S2') then raise exception 'Semestre inválido'; end if;
  insert into public.operational_document_semester_event_keys
    (profile_id, event_type, semester_year, semester, event_id)
  values (p_profile_id, p_event_type, p_semester_year, p_semester, null)
  on conflict (profile_id, event_type, semester_year, semester) do nothing;
  get diagnostics row_count = row_count;
  inserted_key := row_count > 0;
  if not inserted_key then
    return query select k.event_id, false from public.operational_document_semester_event_keys k
    where k.profile_id = p_profile_id and k.event_type = p_event_type
      and k.semester_year = p_semester_year and k.semester = p_semester;
    return;
  end if;
  insert into public.operational_document_events
    (profile_id, event_type, semester_year, semester, actor_id, actor_type, summary, metadata)
  values (p_profile_id, p_event_type, p_semester_year, p_semester, p_actor_id, p_actor_type,
    p_summary, coalesce(p_metadata, '{}'::jsonb))
  returning id into new_event_id;
  update public.operational_document_semester_event_keys set event_id = new_event_id
  where profile_id = p_profile_id and event_type = p_event_type
    and semester_year = p_semester_year and semester = p_semester;
  return query select new_event_id, true;
end;
$$;

revoke all on function public.intranet_create_semester_document_event(uuid, text, integer, text, uuid, text, text, jsonb) from public;
grant execute on function public.intranet_create_semester_document_event(uuid, text, integer, text, uuid, text, text, jsonb) to service_role;
