-- Sprint 18: Documentos tributarios electrónicos vía Haulmer OpenFactura.
-- Emisor: Impresiones Getsemaní (RUT 77.057.636-9).
-- El financiamiento de cuotas NO se guarda como ítem de venta.

create table if not exists public.tax_documents (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  provider text not null default 'haulmer' check (provider = 'haulmer'),
  dte_type integer not null check (dte_type in (33, 39)),
  scope text not null default 'service' check (scope in ('service', 'commission')),
  status text not null default 'pending'
    check (status in ('pending', 'issued', 'failed', 'skipped')),
  folio text,
  provider_token text,
  amount_net numeric(12,2) not null default 0,
  amount_tax numeric(12,2) not null default 0,
  amount_total numeric(12,2) not null default 0,
  receptor_rut text not null,
  receptor_name text not null,
  financing_note text,
  request_payload jsonb,
  provider_response jsonb,
  pdf_base64 text,
  xml_content text,
  timbre_base64 text,
  error_message text,
  environment text not null default 'development'
    check (environment in ('development', 'production')),
  created_by uuid references auth.users(id) on delete set null,
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tax_documents_one_issued_per_payment
  on public.tax_documents (payment_id)
  where status = 'issued';

-- Índice legado por scope (si existía); preferimos un solo DTE emitido por pago.
drop index if exists tax_documents_one_issued_per_scope;

create index if not exists tax_documents_payment_idx
  on public.tax_documents (payment_id, created_at desc);

create index if not exists tax_documents_status_idx
  on public.tax_documents (status, created_at desc);

comment on table public.tax_documents is
  'DTE emitidos con Haulmer OpenFactura (boleta/factura). Financiamiento TC no es ítem de venta.';

comment on column public.tax_documents.scope is
  'service = monto del servicio al cliente; commission = comisión ZOVIT (fee+IVA).';

create or replace function public.set_tax_documents_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_tax_documents_updated_at on public.tax_documents;
create trigger trg_tax_documents_updated_at
  before update on public.tax_documents
  for each row execute function public.set_tax_documents_updated_at();

alter table public.tax_documents enable row level security;

drop policy if exists tax_documents_select_own on public.tax_documents;
create policy tax_documents_select_own
  on public.tax_documents
  for select
  to authenticated
  using (
    exists (
      select 1 from public.payments p
      where p.id = tax_documents.payment_id
        and (p.client_id = auth.uid() or p.professional_id = auth.uid())
    )
    or exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.intranet_role = 'super_admin'
    )
  );

-- Escrituras solo vía service_role (API Next.js).
revoke insert, update, delete on public.tax_documents from authenticated, anon;
grant select on public.tax_documents to authenticated;
grant all on public.tax_documents to service_role;
