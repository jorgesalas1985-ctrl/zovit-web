-- ZOVIT v5.0 FASE 1 (script 2 de 2): asignación, estados, chat, fotos y notificaciones.
-- Ejecutar DESPUÉS de schema_v4.sql en Supabase > SQL Editor > New query > Run.
-- Idempotente: seguro re-ejecutar sobre una base ya configurada.
create extension if not exists pgcrypto;

alter table public.solicitudes_de_servicio
  add column if not exists professional_id uuid references public.profiles(id),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.request_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.solicitudes_de_servicio(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.request_photos (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.solicitudes_de_servicio(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  photo_type text not null check (photo_type in ('before','after')),
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.request_status_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.solicitudes_de_servicio(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid references public.solicitudes_de_servicio(id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists request_messages_request_created_idx on public.request_messages(request_id, created_at);
create index if not exists request_photos_request_idx on public.request_photos(request_id);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);

alter table public.request_messages enable row level security;
alter table public.request_photos enable row level security;
alter table public.request_status_history enable row level security;
alter table public.notifications enable row level security;

-- Elimina políticas legacy de schema_v4.sql para evitar duplicados en solicitudes_de_servicio.
drop policy if exists "solicitudes_select_own" on public.solicitudes_de_servicio;
drop policy if exists "solicitudes_insert_own" on public.solicitudes_de_servicio;
drop policy if exists "solicitudes_update_owner" on public.solicitudes_de_servicio;

-- Permite a profesionales autenticados ver solicitudes públicas y a participantes ver las propias.
drop policy if exists "requests_select_phase1" on public.solicitudes_de_servicio;
create policy "requests_select_phase1" on public.solicitudes_de_servicio for select to authenticated using (
  client_id = auth.uid() or professional_id = auth.uid() or status = 'publicada'
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists "requests_insert_client" on public.solicitudes_de_servicio;
create policy "requests_insert_client" on public.solicitudes_de_servicio for insert to authenticated with check (client_id = auth.uid());

drop policy if exists "requests_update_participants" on public.solicitudes_de_servicio;
create policy "requests_update_participants" on public.solicitudes_de_servicio for update to authenticated using (
  client_id = auth.uid() or professional_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
) with check (
  client_id = auth.uid() or professional_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create or replace function public.is_request_participant(p_request_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from public.solicitudes_de_servicio r
    where r.id=p_request_id and (r.client_id=p_user_id or r.professional_id=p_user_id)
  ) or exists (select 1 from public.profiles p where p.id=p_user_id and p.role='admin');
$$;

drop policy if exists "messages_select_participants" on public.request_messages;
create policy "messages_select_participants" on public.request_messages for select to authenticated using (public.is_request_participant(request_id));
drop policy if exists "messages_insert_participants" on public.request_messages;
create policy "messages_insert_participants" on public.request_messages for insert to authenticated with check (sender_id=auth.uid() and public.is_request_participant(request_id));

drop policy if exists "photos_select_participants" on public.request_photos;
create policy "photos_select_participants" on public.request_photos for select to authenticated using (public.is_request_participant(request_id));
drop policy if exists "photos_insert_participants" on public.request_photos;
create policy "photos_insert_participants" on public.request_photos for insert to authenticated with check (uploaded_by=auth.uid() and public.is_request_participant(request_id));

drop policy if exists "history_select_participants" on public.request_status_history;
create policy "history_select_participants" on public.request_status_history for select to authenticated using (public.is_request_participant(request_id));

drop policy if exists "notifications_own_select" on public.notifications;
create policy "notifications_own_select" on public.notifications for select to authenticated using (user_id=auth.uid());
drop policy if exists "notifications_own_update" on public.notifications;
create policy "notifications_own_update" on public.notifications for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

create or replace function public.accept_service_request(request_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare current_role text;
begin
  select role into current_role from public.profiles where id=auth.uid();
  if current_role not in ('professional','admin') then raise exception 'Solo un profesional puede aceptar trabajos'; end if;
  update public.solicitudes_de_servicio
    set professional_id=auth.uid(), status='aceptada', updated_at=now()
    where id=request_id and status='publicada' and professional_id is null;
  if not found then raise exception 'El trabajo ya fue aceptado o no está disponible'; end if;
end; $$;

create or replace function public.change_service_request_status(request_id uuid, new_status text)
returns void language plpgsql security definer set search_path=public as $$
declare r public.solicitudes_de_servicio%rowtype;
begin
  select * into r from public.solicitudes_de_servicio where id=request_id;
  if not found then raise exception 'Solicitud no encontrada'; end if;
  if new_status not in ('publicada','aceptada','en_camino','en_ejecucion','finalizada','cancelada') then raise exception 'Estado inválido'; end if;
  if auth.uid()=r.professional_id then
    if not ((r.status='aceptada' and new_status='en_camino') or (r.status='en_camino' and new_status='en_ejecucion') or (r.status='en_ejecucion' and new_status='finalizada')) then raise exception 'Cambio de estado no permitido'; end if;
  elsif auth.uid()=r.client_id then
    if not (new_status='cancelada' and r.status in ('publicada','aceptada')) then raise exception 'El cliente no puede realizar ese cambio'; end if;
  elsif not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then
    raise exception 'Sin permiso';
  end if;
  update public.solicitudes_de_servicio set status=new_status, updated_at=now() where id=request_id;
end; $$;

create or replace function public.notify_request_activity()
returns trigger language plpgsql security definer set search_path=public as $$
declare r public.solicitudes_de_servicio%rowtype; target uuid;
begin
  if tg_table_name='request_messages' then
    select * into r from public.solicitudes_de_servicio where id=new.request_id;
    target := case when new.sender_id=r.client_id then r.professional_id else r.client_id end;
    if target is not null then insert into public.notifications(user_id,request_id,title,body) values(target,r.id,'Nuevo mensaje','Tienes un nuevo mensaje en '||coalesce(r.category,'tu solicitud')); end if;
  elsif tg_table_name='solicitudes_de_servicio' then
    if old.status is distinct from new.status then
      insert into public.request_status_history(request_id,old_status,new_status,changed_by) values(new.id,old.status,new.status,auth.uid());
      if new.client_id is not null and new.client_id is distinct from auth.uid() then insert into public.notifications(user_id,request_id,title,body) values(new.client_id,new.id,'Estado actualizado','La solicitud ahora está: '||replace(new.status,'_',' ')); end if;
      if new.professional_id is not null and new.professional_id is distinct from auth.uid() then insert into public.notifications(user_id,request_id,title,body) values(new.professional_id,new.id,'Trabajo actualizado','El trabajo ahora está: '||replace(new.status,'_',' ')); end if;
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists notify_new_message on public.request_messages;
create trigger notify_new_message after insert on public.request_messages for each row execute function public.notify_request_activity();
drop trigger if exists notify_status_change on public.solicitudes_de_servicio;
create trigger notify_status_change after update on public.solicitudes_de_servicio for each row execute function public.notify_request_activity();

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('request-photos','request-photos',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "request_photos_storage_select" on storage.objects;
create policy "request_photos_storage_select" on storage.objects for select to authenticated using (
  bucket_id='request-photos' and public.is_request_participant((storage.foldername(name))[1]::uuid)
);
drop policy if exists "request_photos_storage_insert" on storage.objects;
create policy "request_photos_storage_insert" on storage.objects for insert to authenticated with check (
  bucket_id='request-photos' and (storage.foldername(name))[2]=auth.uid()::text and public.is_request_participant((storage.foldername(name))[1]::uuid)
);

-- Activa Realtime para estas tablas (ignora el aviso si ya estaban agregadas).
do $$ begin
  alter publication supabase_realtime add table public.request_messages;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.solicitudes_de_servicio;
exception when duplicate_object then null; end $$;
