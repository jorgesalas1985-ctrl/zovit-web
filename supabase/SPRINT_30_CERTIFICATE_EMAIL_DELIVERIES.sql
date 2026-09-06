-- Entregas de correo de certificados: idempotencia durable y auditoría server-only.

create table if not exists public.certificate_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid not null references public.issued_certificates(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  idempotency_key uuid not null,
  recipient_email text not null,
  provider_message_id text,
  status text not null check (status in ('processing', 'sent', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, idempotency_key)
);

create index if not exists certificate_email_deliveries_certificate_idx
  on public.certificate_email_deliveries (certificate_id, created_at desc);

alter table public.certificate_email_deliveries enable row level security;
revoke all on table public.certificate_email_deliveries from anon, authenticated;
grant all on table public.certificate_email_deliveries to service_role;

-- La relación única hace que un reintento posterior a una caída no duplique la notificación.
alter table public.notifications
  add column if not exists certificate_email_delivery_id uuid
    references public.certificate_email_deliveries(id) on delete set null;

-- Un constraint (en vez de un índice parcial) permite usar ON CONFLICT desde
-- el servidor. PostgreSQL permite múltiples NULL, por lo que sigue dejando
-- intactas las notificaciones que no pertenecen a una entrega de correo.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'notifications_certificate_email_delivery_once'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
      add constraint notifications_certificate_email_delivery_once
      unique (certificate_email_delivery_id);
  end if;
end $$;
