-- Persist address + commune (+ rut) from signup metadata into profiles.

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
    address,
    commune,
    rut,
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
    new.raw_user_meta_data ->> 'address',
    new.raw_user_meta_data ->> 'commune',
    new.raw_user_meta_data ->> 'rut',
    v_role,
    v_role in ('client', 'admin'),
    v_role in ('professional', 'admin'),
    case when v_role = 'professional' then 'professional' else 'client' end
  )
  on conflict (id) do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    phone = excluded.phone,
    address = coalesce(excluded.address, public.profiles.address),
    commune = coalesce(excluded.commune, public.profiles.commune),
    rut = coalesce(excluded.rut, public.profiles.rut),
    role = excluded.role,
    updated_at = now();
  return new;
end;
$$;
