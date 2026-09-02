-- Sprint 40: una notificación por evento documental, destinatario y tipo.
create table if not exists public.operational_document_notification_deliveries (
  event_id uuid not null references public.operational_document_events(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  notification_kind text not null check (notification_kind in ('semester_renewal_reminder', 'semester_suspension_ready')),
  notification_id uuid references public.notifications(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (event_id, recipient_id, notification_kind)
);
alter table public.operational_document_notification_deliveries enable row level security;
revoke all privileges on table public.operational_document_notification_deliveries from public, anon, authenticated;

create or replace function public.intranet_create_document_event_notification(
  p_event_id uuid, p_recipient_id uuid, p_notification_kind text, p_title text, p_body text
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare delivery_count integer := 0; created_notification_id uuid;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'Acceso no autorizado'; end if;
  insert into public.operational_document_notification_deliveries (event_id, recipient_id, notification_kind)
  values (p_event_id, p_recipient_id, p_notification_kind)
  on conflict do nothing;
  get diagnostics delivery_count = row_count;
  if delivery_count = 0 then return null; end if;
  insert into public.notifications (user_id, request_id, title, body)
  values (p_recipient_id, null, p_title, p_body) returning id into created_notification_id;
  update public.operational_document_notification_deliveries set notification_id = created_notification_id
  where event_id = p_event_id and recipient_id = p_recipient_id and notification_kind = p_notification_kind;
  return created_notification_id;
end;
$$;
revoke all on function public.intranet_create_document_event_notification(uuid, uuid, text, text, text) from public;
grant execute on function public.intranet_create_document_event_notification(uuid, uuid, text, text, text) to service_role;
