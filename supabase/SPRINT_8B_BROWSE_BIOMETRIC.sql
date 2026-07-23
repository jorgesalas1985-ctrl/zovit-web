-- Exponer verificación biométrica en búsqueda de profesionales

drop function if exists public.search_professionals(text, text, text, int);

create or replace function public.search_professionals(
  p_category text default null,
  p_specialty text default null,
  p_commune text default null,
  p_limit int default 6
)
returns table (
  id uuid,
  first_name text,
  last_name text,
  commune text,
  experience_level text,
  service_categories text[],
  specialties text[],
  completed_jobs bigint,
  average_rating numeric,
  rating_count bigint,
  match_score int,
  identity_verified boolean,
  biometric_verified boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_commune text := nullif(trim(p_commune), '');
  normalized_specialty text := nullif(trim(p_specialty), '');
begin
  return query
  with ranked as (
    select
      p.id,
      p.first_name,
      p.last_name,
      p.commune,
      p.experience_level,
      p.service_categories,
      p.specialties,
      coalesce(p.identity_verified, false) as identity_verified,
      coalesce(p.biometric_verified, false) as biometric_verified,
      coalesce(s.completed_jobs, 0) as completed_jobs,
      coalesce(s.average_rating, 0) as average_rating,
      coalesce(s.rating_count, 0) as rating_count,
      (
        case when p_category is not null and p_category = any(p.service_categories) then 40 else 0 end
        + case
            when normalized_specialty is not null
              and exists (
                select 1
                from unnest(p.specialties) specialty
                where lower(specialty) = lower(normalized_specialty)
              ) then 35
            else 0
          end
        + case
            when p_category is not null
              and not (p_category = any(p.service_categories))
              and exists (
                select 1
                from public.professional_experience pe
                where pe.professional_id = p.id
                  and pe.verified = true
                  and lower(pe.category) = lower(p_category)
              ) then 25
            else 0
          end
        + case
            when normalized_specialty is not null
              and exists (
                select 1
                from public.professional_experience pe
                where pe.professional_id = p.id
                  and pe.verified = true
                  and lower(pe.service_summary) like '%' || lower(normalized_specialty) || '%'
              ) then 20
            else 0
          end
        + case
            when normalized_commune is not null
              and p.commune is not null
              and lower(p.commune) = lower(normalized_commune) then 15
            else 0
          end
        + case p.experience_level
            when 'expert' then 12
            when 'verified' then 8
            else 4
          end
        + case when coalesce(p.biometric_verified, false) then 10 else 0 end
        + least(coalesce(s.rating_count, 0), 10)
      )::int as match_score
    from public.profiles p
    left join lateral public.get_professional_stats(p.id) s on true
    where p.role = 'professional'
      and coalesce(p.public_profile, true) = true
  )
  select
    r.id,
    r.first_name,
    r.last_name,
    r.commune,
    r.experience_level,
    r.service_categories,
    r.specialties,
    r.completed_jobs,
    r.average_rating,
    r.rating_count,
    r.match_score,
    r.identity_verified,
    r.biometric_verified
  from ranked r
  where r.match_score > 0
     or p_category is null
  order by r.match_score desc, r.average_rating desc, r.completed_jobs desc
  limit greatest(coalesce(p_limit, 6), 1);
end;
$$;

grant execute on function public.search_professionals(text, text, text, int) to anon, authenticated;
