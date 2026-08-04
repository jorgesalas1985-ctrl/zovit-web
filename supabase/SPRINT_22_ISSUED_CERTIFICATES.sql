-- SPRINT 22: certificados emitidos verificables (folio + QR público)
-- Modelo tipo Duoc: ID de certificado + URL de validación pública.

create table if not exists public.issued_certificates (
  id uuid primary key default gen_random_uuid(),
  folio text not null unique,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  certificate_type text not null default 'experiencia_profesional'
    check (certificate_type in ('experiencia_profesional')),
  title text not null,
  holder_full_name text not null,
  holder_rut_masked text,
  status text not null default 'active'
    check (status in ('active', 'revoked', 'replaced')),
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoke_reason text,
  replaced_by uuid references public.issued_certificates(id),
  snapshot jsonb not null default '{}'::jsonb,
  price_clp integer not null default 0 check (price_clp >= 0),
  billing_status text not null default 'free'
    check (billing_status in ('free', 'pending', 'paid', 'waived')),
  payment_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists issued_certificates_profile_idx
  on public.issued_certificates (profile_id, issued_at desc);

create index if not exists issued_certificates_active_idx
  on public.issued_certificates (profile_id, certificate_type)
  where status = 'active';

alter table public.issued_certificates enable row level security;

drop policy if exists issued_certificates_select_own on public.issued_certificates;
create policy issued_certificates_select_own
  on public.issued_certificates for select to authenticated
  using (profile_id = auth.uid());

-- Lectura pública solo vía RPC (no SELECT abierto a anon).

create or replace function public.get_public_issued_certificate(p_folio text)
returns table (
  folio text,
  certificate_type text,
  title text,
  holder_full_name text,
  holder_rut_masked text,
  status text,
  issued_at timestamptz,
  revoked_at timestamptz,
  revoke_reason text,
  snapshot jsonb,
  billing_status text,
  profile_id uuid
)
language sql
security definer
set search_path = public
stable
as $$
  select
    c.folio,
    c.certificate_type,
    c.title,
    c.holder_full_name,
    c.holder_rut_masked,
    c.status,
    c.issued_at,
    c.revoked_at,
    c.revoke_reason,
    c.snapshot,
    c.billing_status,
    c.profile_id
  from public.issued_certificates c
  where upper(trim(c.folio)) = upper(trim(p_folio));
$$;

revoke all on function public.get_public_issued_certificate(text) from public;
grant execute on function public.get_public_issued_certificate(text) to anon, authenticated;

comment on table public.issued_certificates is
  'Certificados formales emitidos por ZOVIT. El folio se valida en /certificados/{folio}.';
