-- Geospatial RPCs used by the Next.js app.

create or replace function public.calculate_listing_area(p_geojson jsonb)
returns table (
  area_hectares numeric,
  area_acres numeric
)
language sql
immutable
set search_path = public, extensions
as $$
  with geom as (
    select st_makevalid(st_setsrid(st_geomfromgeojson(p_geojson::text), 4326)) as g
  )
  select
    round((st_area(g::geography) / 10000.0)::numeric, 2) as area_hectares,
    round((st_area(g::geography) / 4046.8564224)::numeric, 2) as area_acres
  from geom;
$$;

create or replace function public.search_listings_by_radius(
  p_country_code text,
  p_lat double precision,
  p_lng double precision,
  p_radius_meters integer default 50000,
  p_listing_type_slugs text[] default null,
  p_min_area_acres numeric default null,
  p_max_price_cents integer default null,
  p_limit integer default 24,
  p_offset integer default 0
)
returns table (
  id uuid,
  slug text,
  title text,
  summary text,
  listing_type_slug text,
  listing_type_label text,
  country_code char(2),
  country_name text,
  admin_area_code text,
  admin_area_name text,
  region_slug text,
  nearest_town text,
  public_lat double precision,
  public_lng double precision,
  area_acres numeric,
  area_hectares numeric,
  price_cents integer,
  currency char(3),
  price_unit public.price_unit,
  cover_image_path text,
  featured_score integer,
  published_at timestamptz,
  distance_meters double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with origin as (
    select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as geog
  )
  select
    l.id,
    l.slug,
    l.title,
    l.summary,
    lt.slug,
    lt.label,
    l.country_code,
    l.country_name,
    l.admin_area_code,
    l.admin_area_name,
    l.region_slug,
    l.nearest_town,
    st_y(l.public_point::geometry) as public_lat,
    st_x(l.public_point::geometry) as public_lng,
    l.area_acres,
    l.area_hectares,
    l.price_cents,
    l.currency,
    l.price_unit,
    l.cover_image_path,
    l.featured_score,
    l.published_at,
    st_distance(l.exact_point, origin.geog) as distance_meters
  from public.listings l
  join public.listing_types lt on lt.id = l.listing_type_id
  cross join origin
  where l.status = 'approved'
    and (p_country_code is null or l.country_code = upper(p_country_code)::char(2))
    and st_dwithin(l.exact_point, origin.geog, greatest(p_radius_meters, 1))
    and (p_listing_type_slugs is null or lt.slug = any(p_listing_type_slugs))
    and (p_min_area_acres is null or l.area_acres >= p_min_area_acres)
    and (p_max_price_cents is null or l.price_cents is null or l.price_cents <= p_max_price_cents)
  order by l.featured_score desc, st_distance(l.exact_point, origin.geog), l.published_at desc nulls last
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
$$;

create or replace function public.search_listings_in_bounds(
  p_west double precision,
  p_south double precision,
  p_east double precision,
  p_north double precision,
  p_country_code text default null,
  p_listing_type_slugs text[] default null,
  p_min_area_acres numeric default null,
  p_max_price_cents integer default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  id uuid,
  slug text,
  title text,
  summary text,
  listing_type_slug text,
  listing_type_label text,
  country_code char(2),
  country_name text,
  admin_area_code text,
  admin_area_name text,
  region_slug text,
  nearest_town text,
  public_lat double precision,
  public_lng double precision,
  area_acres numeric,
  area_hectares numeric,
  price_cents integer,
  currency char(3),
  price_unit public.price_unit,
  cover_image_path text,
  featured_score integer,
  published_at timestamptz,
  distance_meters double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with bounds as (
    select st_makeenvelope(p_west, p_south, p_east, p_north, 4326) as geom
  )
  select
    l.id,
    l.slug,
    l.title,
    l.summary,
    lt.slug,
    lt.label,
    l.country_code,
    l.country_name,
    l.admin_area_code,
    l.admin_area_name,
    l.region_slug,
    l.nearest_town,
    st_y(l.public_point::geometry) as public_lat,
    st_x(l.public_point::geometry) as public_lng,
    l.area_acres,
    l.area_hectares,
    l.price_cents,
    l.currency,
    l.price_unit,
    l.cover_image_path,
    l.featured_score,
    l.published_at,
    null::double precision as distance_meters
  from public.listings l
  join public.listing_types lt on lt.id = l.listing_type_id
  cross join bounds
  where l.status = 'approved'
    and (p_country_code is null or l.country_code = upper(p_country_code)::char(2))
    and l.land_boundary && bounds.geom
    and st_intersects(l.land_boundary, bounds.geom)
    and (p_listing_type_slugs is null or lt.slug = any(p_listing_type_slugs))
    and (p_min_area_acres is null or l.area_acres >= p_min_area_acres)
    and (p_max_price_cents is null or l.price_cents is null or l.price_cents <= p_max_price_cents)
  order by l.featured_score desc, l.published_at desc nulls last
  limit least(greatest(p_limit, 1), 250)
  offset greatest(p_offset, 0);
$$;

create or replace function public.get_featured_listings_by_region(
  p_country_code text,
  p_admin_area_code text default null,
  p_region_slug text default null,
  p_limit integer default 8
)
returns table (
  id uuid,
  slug text,
  title text,
  summary text,
  listing_type_slug text,
  listing_type_label text,
  country_code char(2),
  country_name text,
  admin_area_code text,
  admin_area_name text,
  region_slug text,
  nearest_town text,
  public_lat double precision,
  public_lng double precision,
  area_acres numeric,
  area_hectares numeric,
  price_cents integer,
  currency char(3),
  price_unit public.price_unit,
  cover_image_path text,
  featured_score integer,
  published_at timestamptz,
  distance_meters double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    l.id,
    l.slug,
    l.title,
    l.summary,
    lt.slug,
    lt.label,
    l.country_code,
    l.country_name,
    l.admin_area_code,
    l.admin_area_name,
    l.region_slug,
    l.nearest_town,
    st_y(l.public_point::geometry) as public_lat,
    st_x(l.public_point::geometry) as public_lng,
    l.area_acres,
    l.area_hectares,
    l.price_cents,
    l.currency,
    l.price_unit,
    l.cover_image_path,
    l.featured_score,
    l.published_at,
    null::double precision as distance_meters
  from public.listings l
  join public.listing_types lt on lt.id = l.listing_type_id
  where l.status = 'approved'
    and l.country_code = upper(p_country_code)::char(2)
    and (p_admin_area_code is null or l.admin_area_code = upper(p_admin_area_code))
    and (p_region_slug is null or l.region_slug = lower(p_region_slug))
  order by l.featured_score desc, l.published_at desc nulls last
  limit least(greatest(p_limit, 1), 50);
$$;

create or replace function public.get_listing_public_location(p_listing_id uuid)
returns table (
  listing_id uuid,
  public_lat double precision,
  public_lng double precision,
  accuracy_meters integer
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    l.id,
    st_y(l.public_point::geometry),
    st_x(l.public_point::geometry),
    coalesce(rc.public_location_precision_meters, 25000)
  from public.listings l
  left join public.legal_region_configs rc
    on rc.country_code = l.country_code
    and (rc.admin_area_code = l.admin_area_code or rc.admin_area_code is null)
  where l.id = p_listing_id
    and l.status = 'approved'
  order by rc.admin_area_code nulls last
  limit 1;
$$;

create or replace function public.get_listing_public_detail(p_slug text)
returns table (
  id uuid,
  slug text,
  title text,
  summary text,
  description text,
  listing_type_slug text,
  listing_type_label text,
  country_code char(2),
  country_name text,
  admin_area_code text,
  admin_area_name text,
  region_name text,
  region_slug text,
  nearest_town text,
  public_lat double precision,
  public_lng double precision,
  area_acres numeric,
  area_hectares numeric,
  wildlife text[],
  amenities text[],
  rules text[],
  price_cents integer,
  currency char(3),
  price_unit public.price_unit,
  cover_image_path text,
  published_at timestamptz,
  owner_name text
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    l.id,
    l.slug,
    l.title,
    l.summary,
    l.description,
    lt.slug,
    lt.label,
    l.country_code,
    l.country_name,
    l.admin_area_code,
    l.admin_area_name,
    l.region_name,
    l.region_slug,
    l.nearest_town,
    st_y(l.public_point::geometry),
    st_x(l.public_point::geometry),
    l.area_acres,
    l.area_hectares,
    l.wildlife,
    l.amenities,
    l.rules,
    l.price_cents,
    l.currency,
    l.price_unit,
    l.cover_image_path,
    l.published_at,
    p.full_name
  from public.listings l
  join public.listing_types lt on lt.id = l.listing_type_id
  left join public.profiles p on p.id = l.owner_id
  where l.slug = p_slug
    and l.status = 'approved'
  limit 1;
$$;

create or replace function public.get_listing_exact_polygon(p_listing_id uuid)
returns table (
  listing_id uuid,
  boundary_geojson jsonb,
  exact_lat double precision,
  exact_lng double precision,
  address_private text,
  area_acres numeric,
  area_hectares numeric
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
begin
  if not public.can_view_listing_exact_location(p_listing_id, auth.uid()) then
    raise exception 'Exact listing location is available only after approval or confirmed booking'
      using errcode = '42501';
  end if;

  return query
  select
    l.id,
    st_asgeojson(l.land_boundary)::jsonb,
    st_y(l.exact_point::geometry),
    st_x(l.exact_point::geometry),
    l.address_private,
    l.area_acres,
    l.area_hectares
  from public.listings l
  where l.id = p_listing_id;
end;
$$;

grant execute on function public.calculate_listing_area(jsonb) to anon, authenticated, service_role;
grant execute on function public.search_listings_by_radius(text, double precision, double precision, integer, text[], numeric, integer, integer, integer) to anon, authenticated, service_role;
grant execute on function public.search_listings_in_bounds(double precision, double precision, double precision, double precision, text, text[], numeric, integer, integer, integer) to anon, authenticated, service_role;
grant execute on function public.get_featured_listings_by_region(text, text, text, integer) to anon, authenticated, service_role;
grant execute on function public.get_listing_public_location(uuid) to anon, authenticated, service_role;
grant execute on function public.get_listing_public_detail(text) to anon, authenticated, service_role;
grant execute on function public.get_listing_exact_polygon(uuid) to authenticated, service_role;
