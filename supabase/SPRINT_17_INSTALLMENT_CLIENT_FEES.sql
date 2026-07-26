-- Cargo de financiamiento MP (cuotas) al cliente, sin alterar neto del profesional.

alter table public.payments
  add column if not exists client_charged_amount numeric(12,2);

alter table public.payments
  add column if not exists installment_count integer;

alter table public.payments
  add column if not exists provider_financing_fee numeric(12,2) not null default 0
    check (provider_financing_fee >= 0);

comment on column public.payments.client_charged_amount is
  'Monto cobrado al cliente en MP (servicio + financiamiento cuotas). Si null, = amount_gross.';
comment on column public.payments.installment_count is
  'Cuotas elegidas por el cliente (1 = contado/débito).';
comment on column public.payments.provider_financing_fee is
  'Financiamiento/comisión de cuotas MP cobrada al cliente (incluye IVA estimado).';
