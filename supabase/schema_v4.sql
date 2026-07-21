-- ZOVIT v5.0 - schema base (script 1 de 2)
-- Ejecutar PRIMERO en Supabase SQL Editor, antes de FASE_1_COMPLETA.sql.
-- Actualización segura para la base existente. No elimina usuarios ni solicitudes existentes.
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  rut text,
  phone text,
  address text,
  commune text,
  role text not null default 'client',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- La tabla ya visible en tu Supabase se llama solicitudes_de_servicio.
create table if not exists public.solicitudes_de_servicio (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.profiles(id) on delete cascade,
  category text,
  description text,
  address text,
  status text default 'publicada',
  professional_id uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Completa de forma segura columnas que pudieran faltar en una tabla ya creada.
alter table public.solicitudes_de_servicio add column if not exists client_id uuid references public.profiles(id) on delete cascade;
alter table public.solicitudes_de_servicio add column if not exists category text;
alter table public.solicitudes_de_servicio add column if not exists description text;
alter table public.solicitudes_de_servicio add column if not exists address text;
alter table public.solicitudes_de_servicio add column if not exists status text default 'publicada';
alter table public.solicitudes_de_servicio add column if not exists professional_id uuid references public.profiles(id);
alter table public.solicitudes_de_servicio add column if not exists created_at timestamptz default now();
alter table public.solicitudes_de_servicio add column if not exists updated_at timestamptz default now();

alter table public.profiles enable row level security;
alter table public.solicitudes_de_servicio enable row level security;

drop policy if exists "profile_select_own" on public.profiles;
drop policy if exists "profile_insert_own" on public.profiles;
drop policy if exists "profile_update_own" on public.profiles;
drop policy if exists "solicitudes_select_own" on public.solicitudes_de_servicio;
drop policy if exists "solicitudes_insert_own" on public.solicitudes_de_servicio;
drop policy if exists "solicitudes_update_owner" on public.solicitudes_de_servicio;

create policy "profile_select_own"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

create policy "profile_insert_own"
on public.profiles for insert to authenticated
with check ((select auth.uid()) = id);

create policy "profile_update_own"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "solicitudes_select_own"
on public.solicitudes_de_servicio for select to authenticated
using ((select auth.uid()) = client_id or (select auth.uid()) = professional_id);

create policy "solicitudes_insert_own"
on public.solicitudes_de_servicio for insert to authenticated
with check ((select auth.uid()) = client_id);

create policy "solicitudes_update_owner"
on public.solicitudes_de_servicio for update to authenticated
using ((select auth.uid()) = client_id or (select auth.uid()) = professional_id)
with check ((select auth.uid()) = client_id or (select auth.uid()) = professional_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name, phone, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'phone',
    coalesce(new.raw_user_meta_data ->> 'role','client')
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

insert into public.profiles (id, first_name, last_name, phone, role)
select
  id,
  raw_user_meta_data ->> 'first_name',
  raw_user_meta_data ->> 'last_name',
  raw_user_meta_data ->> 'phone',
  coalesce(raw_user_meta_data ->> 'role','client')
from auth.users
on conflict (id) do nothing;

-- Permite al cliente eliminar solamente sus propias solicitudes si se habilita esa opción más adelante.
drop policy if exists "solicitudes_delete_owner" on public.solicitudes_de_servicio;
create policy "solicitudes_delete_owner"
on public.solicitudes_de_servicio for delete to authenticated
using ((select auth.uid()) = client_id);
