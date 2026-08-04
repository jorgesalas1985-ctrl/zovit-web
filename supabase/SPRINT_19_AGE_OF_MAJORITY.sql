-- SPRINT 19: mayoría de edad (18+) para registros cliente/profesional en Chile

alter table public.profiles
  add column if not exists birth_date date;

comment on column public.profiles.birth_date is
  'Fecha de nacimiento; obligatoria en registro público. Debe ser mayor de 18 años (Chile).';

alter table public.profiles
  drop constraint if exists profiles_birth_date_adult_check;

alter table public.profiles
  add constraint profiles_birth_date_adult_check
  check (
    birth_date is null
    or birth_date <= (current_date - interval '18 years')
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta_role text := lower(coalesce(new.raw_user_meta_data ->> 'role', 'client'));
  v_role text;
  v_birth date;
  v_source text := lower(coalesce(new.raw_user_meta_data ->> 'signup_source', ''));
begin
  if v_meta_role = 'professional' then
    v_role := 'professional';
  else
    v_role := 'client';
  end if;

  begin
    v_birth := nullif(new.raw_user_meta_data ->> 'birth_date', '')::date;
  exception
    when others then
      raise exception 'Fecha de nacimiento inválida.';
  end;

  -- Registro público (app /registro): fecha + mayoría de edad obligatorias.
  -- Intranet y otros flujos internos no envían signup_source=public.
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
    intranet_role,
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
    null,
    v_role = 'client',
    v_role = 'professional',
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
    updated_at = now();

  return new;
end;
$$;
