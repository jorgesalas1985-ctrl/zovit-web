-- ZOVIT Sprint 6b: creación real de usuarios intranet
-- Ejecutar en Supabase SQL Editor después de SPRINT_6_INTRANET.sql

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name, phone, role, intranet_role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'phone',
    coalesce(new.raw_user_meta_data ->> 'role', 'client'),
    nullif(new.raw_user_meta_data ->> 'intranet_role', '')
  )
  on conflict (id) do update set
    first_name = coalesce(excluded.first_name, public.profiles.first_name),
    last_name = coalesce(excluded.last_name, public.profiles.last_name),
    phone = coalesce(excluded.phone, public.profiles.phone),
    role = coalesce(excluded.role, public.profiles.role),
    intranet_role = coalesce(excluded.intranet_role, public.profiles.intranet_role),
    updated_at = now();
  return new;
end;
$$;
