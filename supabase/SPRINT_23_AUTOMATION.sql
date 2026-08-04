-- SPRINT 23: automatización de matching y colas

alter table public.solicitudes_de_servicio
  add column if not exists auto_matched_at timestamptz;

comment on column public.solicitudes_de_servicio.auto_matched_at is
  'Marca cuando ZOVIT ya invitó automáticamente a profesionales compatibles.';

create index if not exists solicitudes_auto_match_pending_idx
  on public.solicitudes_de_servicio (created_at)
  where status = 'publicada' and professional_id is null and auto_matched_at is null;
