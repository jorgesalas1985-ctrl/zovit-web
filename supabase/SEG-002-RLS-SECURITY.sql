-- SEG-002: hardening menor y seguro para RLS, ownership y storage.
-- Idempotente: usa create policy if not exists cuando es posible y no destruye datos.

-- 1) RLS en tablas sensibles que hoy usan service_role sin ownership real.

alter table public.identity_documents enable row level security;
alter table public.worker_credentials enable row level security;
alter table public.worker_service_authorizations enable row level security;
alter table public.worker_review_history enable row level security;

-- 2) Políticas de ownership para documentos y credenciales.
drop policy if exists identity_documents_owner_select on public.identity_documents;
create policy identity_documents_owner_select on public.identity_documents
  for select using (auth.uid() = profile_id);

drop policy if exists identity_documents_owner_write on public.identity_documents;
create policy identity_documents_owner_write on public.identity_documents
  for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

drop policy if exists identity_documents_owner_insert on public.identity_documents;
create policy identity_documents_owner_insert on public.identity_documents
  for insert with check (auth.uid() = profile_id);

drop policy if exists worker_credentials_owner_select on public.worker_credentials;
create policy worker_credentials_owner_select on public.worker_credentials
  for select using (auth.uid() = profile_id);

drop policy if exists worker_credentials_owner_write on public.worker_credentials;
create policy worker_credentials_owner_write on public.worker_credentials
  for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

drop policy if exists worker_credentials_owner_insert on public.worker_credentials;
create policy worker_credentials_owner_insert on public.worker_credentials
  for insert with check (auth.uid() = profile_id);

drop policy if exists worker_service_authorizations_owner_select on public.worker_service_authorizations;
create policy worker_service_authorizations_owner_select on public.worker_service_authorizations
  for select using (auth.uid() = profile_id);

drop policy if exists worker_service_authorizations_owner_write on public.worker_service_authorizations;
create policy worker_service_authorizations_owner_write on public.worker_service_authorizations
  for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

drop policy if exists worker_service_authorizations_owner_insert on public.worker_service_authorizations;
create policy worker_service_authorizations_owner_insert on public.worker_service_authorizations
  for insert with check (auth.uid() = profile_id);

drop policy if exists worker_review_history_owner_select on public.worker_review_history;
create policy worker_review_history_owner_select on public.worker_review_history
  for select using (auth.uid() = profile_id);

drop policy if exists worker_review_history_owner_insert on public.worker_review_history;
create policy worker_review_history_owner_insert on public.worker_review_history
  for insert with check (auth.uid() = profile_id);

-- 3) Políticas intranet restringidas a hr_admin/super_admin para tablas sensibles.
drop policy if exists identity_documents_intranet_admin on public.identity_documents;
create policy identity_documents_intranet_admin on public.identity_documents
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.intranet_role in ('hr_admin', 'super_admin')
    )
  );

drop policy if exists worker_credentials_intranet_admin on public.worker_credentials;
create policy worker_credentials_intranet_admin on public.worker_credentials
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.intranet_role in ('hr_admin', 'super_admin')
    )
  );

drop policy if exists worker_service_authorizations_intranet_admin on public.worker_service_authorizations;
create policy worker_service_authorizations_intranet_admin on public.worker_service_authorizations
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.intranet_role in ('hr_admin', 'super_admin')
    )
  );

drop policy if exists worker_review_history_intranet_admin on public.worker_review_history;
create policy worker_review_history_intranet_admin on public.worker_review_history
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.intranet_role in ('hr_admin', 'super_admin')
    )
  );

-- 4) Evitar políticas abiertas que permitan lectura a todo el mundo.
-- Se deja el acceso público solo a datos no sensibles; el resto debe filtrarse por ownership.

drop policy if exists worker_public_badges_public_read on public.worker_public_badges;
create policy worker_public_badges_public_read on public.worker_public_badges
  for select using (false);

-- 5) Ajuste de seguridad para funciones RPC sensibles: usar auth.uid() en la función y no confiar en p_user_id recibido por cliente.
-- Este bloque es seguro para aplicar en modo SQL editor, pero no reemplaza una migración completa si la función ya existe.

create or replace function public.request_payout(
  p_amount numeric,
  p_bank_name text,
  p_bank_account_type text,
  p_bank_account_number text,
  p_account_holder_name text,
  p_account_holder_rut text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'No autenticado.';
  end if;

  insert into public.payout_requests (
    user_id,
    amount,
    bank_name,
    bank_account_type,
    bank_account_number,
    account_holder_name,
    account_holder_rut,
    status,
    created_at,
    updated_at
  ) values (
    v_user_id,
    p_amount,
    p_bank_name,
    p_bank_account_type,
    p_bank_account_number,
    p_account_holder_name,
    p_account_holder_rut,
    'pendiente',
    now(),
    now()
  ) returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.request_payout(numeric, text, text, text, text, text) to authenticated;
