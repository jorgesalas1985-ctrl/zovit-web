-- Dual client/professional account: capability flags + active mode.

alter table public.profiles
  add column if not exists can_act_as_client boolean not null default true,
  add column if not exists can_act_as_professional boolean not null default false,
  add column if not exists active_mode text not null default 'client';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_active_mode_check'
  ) then
    alter table public.profiles
      add constraint profiles_active_mode_check
      check (active_mode in ('client', 'professional'));
  end if;
end $$;

-- Backfill from registration role.
update public.profiles
set
  can_act_as_client = case
    when role in ('client', 'admin') then true
    else false
  end,
  can_act_as_professional = case
    when role in ('professional', 'admin') then true
    else false
  end,
  active_mode = case
    when role = 'professional' then 'professional'
    else 'client'
  end;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := coalesce(new.raw_user_meta_data ->> 'role', 'client');
begin
  insert into public.profiles (
    id,
    first_name,
    last_name,
    phone,
    role,
    can_act_as_client,
    can_act_as_professional,
    active_mode
  )
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'phone',
    v_role,
    v_role in ('client', 'admin'),
    v_role in ('professional', 'admin'),
    case when v_role = 'professional' then 'professional' else 'client' end
  )
  on conflict (id) do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    phone = excluded.phone,
    role = excluded.role,
    updated_at = now();
  return new;
end;
$$;

create or replace function public.protect_profile_mode_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_setting('role', true) = 'service_role' then
    return new;
  end if;

  if (
    old.can_act_as_client is distinct from new.can_act_as_client
    or old.can_act_as_professional is distinct from new.can_act_as_professional
    or old.active_mode is distinct from new.active_mode
  ) and current_setting('zovit.mode_change', true) is distinct from '1' then
    new.can_act_as_client := old.can_act_as_client;
    new.can_act_as_professional := old.can_act_as_professional;
    new.active_mode := old.active_mode;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_mode_fields on public.profiles;
create trigger protect_profile_mode_fields
  before update on public.profiles
  for each row
  execute function public.protect_profile_mode_fields();

create or replace function public.activate_professional_mode()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  perform set_config('zovit.mode_change', '1', true);

  update public.profiles
  set
    can_act_as_professional = true,
    active_mode = 'professional',
    updated_at = now()
  where id = v_uid;

  perform set_config('zovit.mode_change', '', true);
end;
$$;

create or replace function public.activate_client_mode()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  perform set_config('zovit.mode_change', '1', true);

  update public.profiles
  set
    can_act_as_client = true,
    active_mode = 'client',
    updated_at = now()
  where id = v_uid;

  perform set_config('zovit.mode_change', '', true);
end;
$$;

create or replace function public.switch_active_mode(p_mode text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  if p_mode not in ('client', 'professional') then
    raise exception 'Modo inválido';
  end if;

  select * into v_profile from public.profiles where id = v_uid;

  if not found then
    raise exception 'Perfil no encontrado';
  end if;

  if p_mode = 'client' and not v_profile.can_act_as_client then
    raise exception 'Modo cliente no habilitado';
  end if;

  if p_mode = 'professional' and not v_profile.can_act_as_professional then
    raise exception 'Modo profesional no habilitado';
  end if;

  perform set_config('zovit.mode_change', '1', true);

  update public.profiles
  set active_mode = p_mode, updated_at = now()
  where id = v_uid;

  perform set_config('zovit.mode_change', '', true);
end;
$$;

grant execute on function public.activate_professional_mode() to authenticated;
grant execute on function public.activate_client_mode() to authenticated;
grant execute on function public.switch_active_mode(text) to authenticated;

drop policy if exists "requests_insert_client" on public.solicitudes_de_servicio;

create policy "requests_insert_client"
  on public.solicitudes_de_servicio
  for insert
  to authenticated
  with check (
    client_id = auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and (
          p.role = 'admin'
          or (p.can_act_as_client = true and p.active_mode = 'client')
        )
    )
  );
