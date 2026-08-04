-- Sprint 28: perfiles publicos del ecosistema.
-- Agrega account_kind para distinguir Cliente, Profesional, Alumno y Empresa
-- sin romper el role historico client/professional/admin.

alter table public.profiles
  add column if not exists account_kind text;

alter table public.profiles
  add column if not exists primary_service_profile text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_account_kind_check'
  ) then
    alter table public.profiles
      add constraint profiles_account_kind_check
      check (
        account_kind is null
        or account_kind in ('client', 'professional', 'student', 'company', 'institution')
      )
      not valid;
  end if;
end $$;

alter table public.profiles
  validate constraint profiles_account_kind_check;

-- IMPORTANTE: esta funcion reemplaza la version del Sprint 19/20 (mayoria de edad).
-- Se reincorpora aqui la validacion de fecha de nacimiento y el guardado de birth_date
-- para no perder esa proteccion al agregar account_kind.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account_kind text := coalesce(new.raw_user_meta_data ->> 'account_kind', new.raw_user_meta_data ->> 'role', 'client');
  v_role text := case
    when v_account_kind in ('professional', 'student') then 'professional'
    when v_account_kind = 'company' then 'client'
    else coalesce(new.raw_user_meta_data ->> 'role', 'client')
  end;
  v_birth date;
  v_source text := lower(coalesce(new.raw_user_meta_data ->> 'signup_source', ''));
begin
  begin
    v_birth := nullif(new.raw_user_meta_data ->> 'birth_date', '')::date;
  exception
    when others then
      raise exception 'Fecha de nacimiento inválida.';
  end;

  -- Registro publico (app /registro): fecha + mayoria de edad obligatorias.
  if v_source = 'public' then
    if v_birth is null then
      raise exception 'Debes indicar tu fecha de nacimiento. Solo mayores de 18 años pueden registrarse en ZOVIT.';
    end if;
    if v_birth > (current_date - interval '18 years') then
      raise exception 'Debes ser mayor de 18 años para registrarte en ZOVIT (Chile).';
    end if;
  elsif v_birth is not null and v_birth > (current_date - interval '18 years') then
    raise exception 'Debes ser mayor de 18 años para registrarte en ZOVIT (Chile).';
  end if;

  insert into public.profiles (
    id,
    first_name,
    last_name,
    phone,
    address,
    commune,
    rut,
    birth_date,
    role,
    account_kind,
    primary_service_profile,
    can_act_as_client,
    can_act_as_professional,
    active_mode
  )
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'address',
    new.raw_user_meta_data ->> 'commune',
    new.raw_user_meta_data ->> 'rut',
    v_birth,
    v_role,
    v_account_kind,
    nullif(new.raw_user_meta_data ->> 'primary_service_profile', ''),
    v_role in ('client', 'admin'),
    v_role in ('professional', 'admin'),
    case when v_role = 'professional' then 'professional' else 'client' end
  )
  on conflict (id) do update set
    first_name = coalesce(excluded.first_name, public.profiles.first_name),
    last_name = coalesce(excluded.last_name, public.profiles.last_name),
    phone = coalesce(excluded.phone, public.profiles.phone),
    address = coalesce(excluded.address, public.profiles.address),
    commune = coalesce(excluded.commune, public.profiles.commune),
    rut = coalesce(excluded.rut, public.profiles.rut),
    birth_date = coalesce(excluded.birth_date, public.profiles.birth_date),
    role = excluded.role,
    account_kind = coalesce(excluded.account_kind, public.profiles.account_kind),
    primary_service_profile = coalesce(excluded.primary_service_profile, public.profiles.primary_service_profile),
    updated_at = now();
  return new;
end;
$$;
