-- Certificado ZOVIT público: clientes y profesionales (RUT enmascarado).
create or replace function public.get_public_credential(p_profile_id uuid)
returns table (
  id uuid,
  first_name text,
  last_name text,
  rut text,
  role text,
  avatar_url text,
  identity_verified boolean,
  biometric_verified boolean,
  study_verified boolean,
  identity_status text,
  experience_level text
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
    case
      when p.rut is null or length(regexp_replace(p.rut, '[^0-9kK]', '', 'g')) < 5 then null
      else '******-' || right(regexp_replace(upper(p.rut), '[^0-9K]', '', 'g'), 1)
    end as rut,
    p.role,
    p.avatar_url,
    coalesce(p.identity_verified, false),
    coalesce(p.biometric_verified, false),
    coalesce(p.study_verified, false),
    coalesce(p.identity_status, 'none'),
    p.experience_level
  from public.profiles p
  where p.id = p_profile_id
    and coalesce(p.public_profile, true) = true
    and p.role in ('client', 'professional', 'admin');
$$;

revoke all on function public.get_public_credential(uuid) from public;
grant execute on function public.get_public_credential(uuid) to anon, authenticated;
