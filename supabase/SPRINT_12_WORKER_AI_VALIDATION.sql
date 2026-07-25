-- Sprint 12: documentos de trabajadores + cola de validación IA
-- Aditivo. Ejecutar en SQL Editor de Supabase.

-- Columnas de seguimiento IA en el registro
alter table public.worker_registrations
  add column if not exists ai_review_status text
    check (
      ai_review_status is null
      or ai_review_status in ('pending', 'processing', 'approved', 'rejected', 'dudoso')
    ),
  add column if not exists ai_review_at timestamptz,
  add column if not exists ai_review_summary text,
  add column if not exists ai_confidence numeric(4, 3),
  add column if not exists ai_forgery_risk text
    check (
      ai_forgery_risk is null
      or ai_forgery_risk in ('low', 'medium', 'high')
    );

alter table public.worker_credentials
  add column if not exists document_mime text,
  add column if not exists ai_notes text,
  add column if not exists ai_forgery_risk text
    check (
      ai_forgery_risk is null
      or ai_forgery_risk in ('low', 'medium', 'high')
    );

comment on column public.worker_registrations.ai_review_status is
  'Resultado de validación automática: approved | rejected | dudoso | pending | processing';

-- Bucket privado para certificados / licencias / matrículas
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'worker-credentials',
  'worker-credentials',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/json']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists worker_credentials_storage_select on storage.objects;
create policy worker_credentials_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'worker-credentials'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.intranet_role in ('hr_admin', 'super_admin')
      )
    )
  );

drop policy if exists worker_credentials_storage_insert on storage.objects;
create policy worker_credentials_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'worker-credentials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists worker_credentials_storage_update on storage.objects;
create policy worker_credentials_storage_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'worker-credentials'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.intranet_role in ('hr_admin', 'super_admin')
      )
    )
  );

drop policy if exists worker_credentials_storage_delete on storage.objects;
create policy worker_credentials_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'worker-credentials'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.intranet_role in ('hr_admin', 'super_admin')
      )
    )
  );

-- Al enviar a revisión, marcar cola IA pendiente si aún no hay veredicto
-- (la app también lo setea; esto es respaldo opcional vía trigger no incluido).
