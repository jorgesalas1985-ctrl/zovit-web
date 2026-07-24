-- Credencial ZOVIT: fotos de perfil públicas + consulta pública segura

alter table public.profiles
  add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists profile_avatars_storage_select on storage.objects;
create policy profile_avatars_storage_select on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'profile-avatars');

drop policy if exists profile_avatars_storage_insert on storage.objects;
create policy profile_avatars_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists profile_avatars_storage_update on storage.objects;
create policy profile_avatars_storage_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists profile_avatars_storage_delete on storage.objects;
create policy profile_avatars_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create or replace function public.get_public_credential(p_profile_id uuid)
returns table (
  id uuid,
  first_name text,
  last_name text,
  rut text,
  role text,
  avatar_url text,
  identity_verified boolean,
  biometric_verified boolean,
  study_verified boolean,
  identity_status text,
  experience_level text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id,
    p.first_name,
    p.last_name,
    p.rut,
    p.role,
    p.avatar_url,
    coalesce(p.identity_verified, false),
    coalesce(p.biometric_verified, false),
    coalesce(p.study_verified, false),
    coalesce(p.identity_status, 'none'),
    p.experience_level
  from public.profiles p
  where p.id = p_profile_id;
$$;

revoke all on function public.get_public_credential(uuid) from public;
grant execute on function public.get_public_credential(uuid) to anon, authenticated;
