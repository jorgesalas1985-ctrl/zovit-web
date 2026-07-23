-- Fix: "current_role" es palabra reservada en PostgreSQL y devolvía "postgres"
-- en lugar del rol del perfil. Renombrar a profile_role.

create or replace function public.accept_service_request(request_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare
  caller_id uuid := auth.uid();
  profile_role text;
begin
  if caller_id is null then
    raise exception 'Sesión no válida';
  end if;

  select p.role into profile_role
  from public.profiles p
  where p.id = caller_id;

  if coalesce(profile_role, '') not in ('professional', 'admin') then
    raise exception 'Solo un profesional puede aceptar trabajos';
  end if;

  update public.solicitudes_de_servicio
    set professional_id = caller_id, status = 'aceptada', updated_at = now()
    where id = request_id and status = 'publicada' and professional_id is null;

  if not found then
    raise exception 'El trabajo ya fue aceptado o no está disponible';
  end if;
end;
$$;

grant execute on function public.accept_service_request(uuid) to authenticated;

drop function if exists public.debug_auth_context();
