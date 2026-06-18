-- Safety follow-up for projects where the onboarding migration was already
-- applied before role updates moved behind a constrained RPC.

create or replace function public.complete_profile_onboarding(
  p_role public.user_role,
  p_first_name text,
  p_last_name text,
  p_street_address text,
  p_city text,
  p_admin_area_code text default null,
  p_postal_code text default null,
  p_phone text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_full_name text := trim(concat_ws(' ', nullif(p_first_name, ''), nullif(p_last_name, '')));
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_role not in ('hunter'::public.user_role, 'landowner'::public.user_role) then
    raise exception 'Unsupported onboarding role' using errcode = '22023';
  end if;

  insert into public.profiles (
    id,
    role,
    first_name,
    last_name,
    full_name,
    phone,
    country_code,
    street_address,
    city,
    admin_area_code,
    postal_code,
    onboarding_completed,
    role_selected_at
  )
  values (
    v_user_id,
    p_role,
    nullif(p_first_name, ''),
    nullif(p_last_name, ''),
    nullif(v_full_name, ''),
    nullif(p_phone, ''),
    'US',
    nullif(p_street_address, ''),
    nullif(p_city, ''),
    nullif(p_admin_area_code, ''),
    nullif(p_postal_code, ''),
    true,
    now()
  )
  on conflict (id) do update
  set role = excluded.role,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      full_name = excluded.full_name,
      phone = excluded.phone,
      country_code = excluded.country_code,
      street_address = excluded.street_address,
      city = excluded.city,
      admin_area_code = excluded.admin_area_code,
      postal_code = excluded.postal_code,
      onboarding_completed = true,
      role_selected_at = now();
end;
$$;

grant execute on function public.complete_profile_onboarding(
  public.user_role,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to authenticated;

revoke update (role) on public.profiles from authenticated;
revoke insert (role) on public.profiles from authenticated;
