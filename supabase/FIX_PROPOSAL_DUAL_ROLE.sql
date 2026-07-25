-- Permite proponer/aceptar trabajos a cuentas duales (can_act_as_professional)
-- sin exigir profiles.role = 'professional'.

create or replace function public.create_service_proposal(
  p_request_id uuid,
  p_amount numeric,
  p_description text,
  p_estimated_hours numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  profile_row public.profiles%rowtype;
  request_row public.solicitudes_de_servicio%rowtype;
  proposal_id uuid;
begin
  if caller_id is null then
    raise exception 'Sesión no válida';
  end if;

  select * into profile_row from public.profiles where id = caller_id;
  if not found then
    raise exception 'Perfil no encontrado';
  end if;

  if coalesce(profile_row.role, '') not in ('professional', 'admin')
     and coalesce(profile_row.can_act_as_professional, false) is not true then
    raise exception 'Solo un profesional puede enviar propuestas';
  end if;

  select * into request_row from public.solicitudes_de_servicio where id = p_request_id;
  if not found then raise exception 'Solicitud no encontrada'; end if;
  if request_row.status <> 'publicada' then
    raise exception 'La solicitud no acepta propuestas en este estado';
  end if;
  if request_row.client_id = caller_id and coalesce(profile_row.role, '') <> 'admin' then
    raise exception 'No puedes enviar una propuesta a tu propia solicitud';
  end if;

  insert into public.service_proposals (
    request_id, professional_id, amount, description, estimated_hours
  ) values (
    p_request_id, caller_id, p_amount, trim(p_description), p_estimated_hours
  ) returning id into proposal_id;

  insert into public.notifications(user_id, request_id, title, body)
  values (
    request_row.client_id,
    p_request_id,
    'Nueva propuesta recibida',
    'Un profesional envió una propuesta para tu solicitud de ' || coalesce(request_row.category, 'servicio')
  );

  return proposal_id;
end;
$$;

create or replace function public.accept_service_request(request_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare
  caller_id uuid := auth.uid();
  profile_row public.profiles%rowtype;
begin
  if caller_id is null then
    raise exception 'Sesión no válida';
  end if;

  select * into profile_row from public.profiles where id = caller_id;
  if not found then
    raise exception 'Perfil no encontrado';
  end if;

  if coalesce(profile_row.role, '') not in ('professional', 'admin')
     and coalesce(profile_row.can_act_as_professional, false) is not true then
    raise exception 'Solo un profesional puede aceptar trabajos';
  end if;

  update public.solicitudes_de_servicio
    set professional_id = caller_id, status = 'aceptada', updated_at = now()
    where id = request_id and status = 'publicada' and professional_id is null
      and client_id <> caller_id;

  if not found then
    raise exception 'El trabajo ya fue aceptado, no está disponible o es tu propia solicitud';
  end if;
end;
$$;

grant execute on function public.create_service_proposal(uuid, numeric, text, numeric) to authenticated;
grant execute on function public.accept_service_request(uuid) to authenticated;
