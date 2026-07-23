-- Sprint 7: Verificación gratuita de identidad (clientes y profesionales)

alter table public.profiles
  add column if not exists identity_status text not null default 'none'
    check (identity_status in ('none', 'pending', 'approved', 'rejected')),
  add column if not exists identity_verified boolean not null default false,
  add column if not exists identity_verified_at timestamptz,
  add column if not exists identity_submitted_at timestamptz,
  add column if not exists identity_rejection_reason text;

create table if not exists public.identity_documents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  document_type text not null check (document_type in ('cedula_front', 'cedula_back', 'certificado_antecedentes')),
  storage_path text not null unique,
  status text not null default 'uploaded' check (status in ('uploaded', 'approved', 'rejected')),
  admin_notes text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, document_type)
);

create index if not exists identity_documents_profile_idx on public.identity_documents(profile_id);
create index if not exists profiles_identity_status_idx on public.profiles(identity_status);

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_platform_admin() to authenticated;

create or replace function public.submit_identity_verification()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  required_count int;
  uploaded_count int;
  current_status text;
  caller_rut text;
begin
  if auth.uid() is null then
    raise exception 'Sesión no válida';
  end if;

  select role, identity_status, rut
    into caller_role, current_status, caller_rut
  from public.profiles
  where id = auth.uid();

  if current_status = 'pending' then
    raise exception 'Tu verificación ya está en revisión';
  end if;

  if current_status = 'approved' then
    raise exception 'Tu identidad ya está verificada';
  end if;

  if caller_rut is null or btrim(caller_rut) = '' then
    raise exception 'Completa tu RUT en Mi perfil antes de enviar la verificación';
  end if;

  if caller_role in ('professional', 'admin') then
    required_count := 3;
  else
    required_count := 2;
  end if;

  select count(*) into uploaded_count
  from public.identity_documents
  where profile_id = auth.uid()
    and status in ('uploaded', 'approved')
    and document_type in ('cedula_front', 'cedula_back', 'certificado_antecedentes')
    and (
      document_type in ('cedula_front', 'cedula_back')
      or caller_role in ('professional', 'admin')
    );

  if uploaded_count < required_count then
    raise exception 'Debes subir todos los documentos requeridos antes de enviar';
  end if;

  update public.profiles
  set
    identity_status = 'pending',
    identity_submitted_at = now(),
    identity_rejection_reason = null,
    updated_at = now()
  where id = auth.uid();
end;
$$;

grant execute on function public.submit_identity_verification() to authenticated;

alter table public.identity_documents enable row level security;

drop policy if exists identity_documents_select on public.identity_documents;
create policy identity_documents_select on public.identity_documents
  for select to authenticated
  using (profile_id = auth.uid() or public.is_platform_admin());

drop policy if exists identity_documents_insert on public.identity_documents;
create policy identity_documents_insert on public.identity_documents
  for insert to authenticated
  with check (profile_id = auth.uid());

drop policy if exists identity_documents_update on public.identity_documents;
create policy identity_documents_update on public.identity_documents
  for update to authenticated
  using (profile_id = auth.uid() or public.is_platform_admin())
  with check (profile_id = auth.uid() or public.is_platform_admin());

drop policy if exists identity_documents_delete on public.identity_documents;
create policy identity_documents_delete on public.identity_documents
  for delete to authenticated
  using (profile_id = auth.uid() or public.is_platform_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'identity-documents',
  'identity-documents',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists identity_documents_storage_select on storage.objects;
create policy identity_documents_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'identity-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_platform_admin()
    )
  );

drop policy if exists identity_documents_storage_insert on storage.objects;
create policy identity_documents_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'identity-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists identity_documents_storage_delete on storage.objects;
create policy identity_documents_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'identity-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_platform_admin()
    )
  );

grant select, insert, update, delete on public.identity_documents to authenticated;
