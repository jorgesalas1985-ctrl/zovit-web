-- SPRINT 18: endurecimiento anti-bypass y privacidad de dirección
-- 1) Bloquear "aceptar sin pago"
-- 2) Función de enmascarado + RPC de tablero de trabajos
-- 3) Columna checkout_lock para idempotencia de preferencias MP

create or replace function public.accept_service_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception
    'Ya no se puede aceptar sin pago. Envía una propuesta y el cliente paga con protección ZOVIT.';
end;
$$;

revoke all on function public.accept_service_request(uuid) from public;
grant execute on function public.accept_service_request(uuid) to authenticated, service_role;

create or replace function public.mask_service_address(full_address text)
returns text
language plpgsql
immutable
as $$
declare
  raw text := trim(coalesce(full_address, ''));
  parts text[];
  tokens text[];
begin
  if raw = '' then
    return 'Zona por confirmar';
  end if;

  parts := string_to_array(raw, ',');
  if array_length(parts, 1) >= 2 then
    return 'Zona: ' || trim(parts[array_length(parts, 1)]);
  end if;

  tokens := regexp_split_to_array(raw, '\s+');
  if array_length(tokens, 1) >= 2 then
    return 'Zona: ' || tokens[array_length(tokens, 1) - 1] || ' ' || tokens[array_length(tokens, 1)];
  end if;

  return 'Zona aproximada (dirección exacta tras el pago)';
end;
$$;

create or replace function public.get_open_jobs_for_professionals()
returns table (
  id uuid,
  category text,
  description text,
  address text,
  status text,
  created_at timestamptz,
  professional_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  profile_row public.profiles%rowtype;
begin
  if caller_id is null then
    raise exception 'Sesión no válida';
  end if;

  select * into profile_row from public.profiles where profiles.id = caller_id;
  if not found then
    raise exception 'Perfil no encontrado';
  end if;

  if coalesce(profile_row.role, '') not in ('professional', 'admin')
     and coalesce(profile_row.can_act_as_professional, false) is not true then
    raise exception 'Solo profesionales pueden ver el tablero de trabajos';
  end if;

  return query
  select
    r.id,
    r.category,
    r.description,
    case
      when r.client_id = caller_id or coalesce(profile_row.role, '') = 'admin'
        then r.address
      when exists (
        select 1
        from public.payments p
        where p.request_id = r.id
          and p.professional_id = caller_id
          and p.status in (
            'pago_retenido',
            'trabajo_en_ejecucion',
            'esperando_aprobacion_cliente',
            'pago_liberado',
            'en_disputa'
          )
      ) then r.address
      else public.mask_service_address(r.address)
    end as address,
    r.status,
    r.created_at,
    r.professional_id
  from public.solicitudes_de_servicio r
  where r.status = 'publicada' or r.professional_id = caller_id
  order by r.created_at desc;
end;
$$;

revoke all on function public.get_open_jobs_for_professionals() from public;
grant execute on function public.get_open_jobs_for_professionals() to authenticated, service_role;

alter table public.payments
  add column if not exists checkout_preference_id text;

comment on column public.payments.checkout_preference_id is
  'Preferencia MP activa para reutilizar checkout e evitar cobros duplicados';

-- 4) Comisión pasarela (MP) estimada + real, para que el ledger no ignore el costo
alter table public.payments
  add column if not exists provider_processing_fee_estimated numeric(12,2) not null default 0
    check (provider_processing_fee_estimated >= 0);

alter table public.payments
  add column if not exists provider_processing_fee numeric(12,2) not null default 0
    check (provider_processing_fee >= 0);

comment on column public.payments.provider_processing_fee_estimated is
  'Estimación de comisión MP (+IVA) al crear checkout; se descuenta de la comisión neta ZOVIT.';

comment on column public.payments.provider_processing_fee is
  'Comisión MP real (+IVA) según fee_details del pago aprobado.';

-- 5) Cerrar SELECT amplio de perfiles públicos (PII: rut/phone/address)
alter table public.profiles
  add column if not exists primary_service_profile text;

drop policy if exists "profiles_public_professional_select" on public.profiles;

create or replace function public.get_public_professional_profile(p_id uuid)
returns table (
  id uuid,
  first_name text,
  last_name text,
  commune text,
  experience_level text,
  public_profile boolean,
  role text,
  identity_verified boolean,
  primary_service_profile text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id,
    p.first_name,
    p.last_name,
    p.commune,
    coalesce(p.experience_level, 'junior'),
    coalesce(p.public_profile, true),
    p.role,
    coalesce(p.identity_verified, false),
    p.primary_service_profile
  from public.profiles p
  where p.id = p_id
    and p.role = 'professional'
    and coalesce(p.public_profile, true) = true;
$$;

revoke all on function public.get_public_professional_profile(uuid) from public;
grant execute on function public.get_public_professional_profile(uuid) to anon, authenticated;

-- Revocar SELECT anónimo directo a profiles (la UI pública usa RPC).
revoke select on public.profiles from anon;
