-- Final Huntfields listing search/runtime alignment for the current production
-- schema. This migration is intentionally idempotent: it can be run after the
-- schema shown in Supabase without requiring the failed earlier 015 version.

create schema if not exists extensions;
create extension if not exists postgis with schema extensions;

alter table public.listings
  add column if not exists reported_area_acres numeric(12, 2),
  add column if not exists reported_area_hectares numeric(12, 2),
  add column if not exists area_display_source text not null default 'drawn_boundary';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'listings_reported_area_positive'
  ) then
    alter table public.listings
      add constraint listings_reported_area_positive
      check (
        (reported_area_acres is null and reported_area_hectares is null)
        or (
          reported_area_acres is not null
          and reported_area_acres > 0
          and reported_area_hectares is not null
          and reported_area_hectares > 0
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'listings_area_display_source_check'
  ) then
    alter table public.listings
      add constraint listings_area_display_source_check
      check (area_display_source in ('drawn_boundary', 'owner_reported', 'survey'));
  end if;
end $$;

create or replace function public.normalize_listing_reported_area()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.reported_area_acres is not null then
    if new.reported_area_acres <= 0 then
      raise exception 'reported_area_acres must be positive';
    end if;

    new.reported_area_acres := round(new.reported_area_acres, 2);
    new.reported_area_hectares := round(new.reported_area_acres * 0.40468564224, 2);

    if new.area_display_source = 'drawn_boundary' then
      new.area_display_source := 'owner_reported';
    end if;
  else
    new.reported_area_hectares := null;
    new.area_display_source := 'drawn_boundary';
  end if;

  return new;
end;
$$;

drop trigger if exists listings_normalize_reported_area on public.listings;
create trigger listings_normalize_reported_area
before insert or update of reported_area_acres, reported_area_hectares, area_display_source
on public.listings
for each row execute function public.normalize_listing_reported_area();

create index if not exists listings_region_status_idx
  on public.listings (country_code, admin_area_code, status, featured_score desc, published_at desc);

create index if not exists listings_display_area_idx
  on public.listings ((coalesce(reported_area_acres, area_acres)));

grant select (
  reported_area_acres,
  reported_area_hectares,
  area_display_source
) on public.listings to anon, authenticated;

grant insert (
  reported_area_acres,
  reported_area_hectares,
  area_display_source
) on public.listings to authenticated;

grant update (
  reported_area_acres,
  reported_area_hectares,
  area_display_source
) on public.listings to authenticated;

create or replace function public.make_public_boundary_preview(
  p_boundary extensions.geometry,
  p_exact_point extensions.geography,
  p_public_point extensions.geography
)
returns jsonb
language sql
immutable
set search_path = public, extensions
as $$
  with shifted as (
    select st_translate(
      st_makevalid(p_boundary),
      st_x(p_public_point::geometry) - st_x(p_exact_point::geometry),
      st_y(p_public_point::geometry) - st_y(p_exact_point::geometry)
    ) as geom
  ),
  generalized as (
    select st_multi(
      st_collectionextract(
        st_makevalid(
          st_snaptogrid(
            st_simplifypreservetopology(geom, 0.0002),
            0.0002
          )
        ),
        3
      )
    ) as geom
    from shifted
  )
  select st_asgeojson(geom, 6)::jsonb
  from generalized;
$$;

drop function if exists public.search_listings_by_region(
  text,
  text,
  text[],
  numeric,
  integer,
  integer,
  integer
);

create function public.search_listings_by_region(
  p_country_code text default 'US',
  p_admin_area_code text default null,
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
  public_boundary_geojson jsonb,
  area_acres numeric,
  area_hectares numeric,
  area_display_source text,
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
    public.make_public_boundary_preview(l.land_boundary, l.exact_point, l.public_point),
    coalesce(l.reported_area_acres, l.area_acres) as area_acres,
    coalesce(l.reported_area_hectares, l.area_hectares) as area_hectares,
    coalesce(l.area_display_source, 'drawn_boundary') as area_display_source,
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
    and (p_country_code is null or l.country_code = upper(p_country_code)::char(2))
    and (p_admin_area_code is null or l.admin_area_code = upper(p_admin_area_code))
    and (p_listing_type_slugs is null or lt.slug = any(p_listing_type_slugs))
    and (p_min_area_acres is null or coalesce(l.reported_area_acres, l.area_acres) >= p_min_area_acres)
    and (p_max_price_cents is null or l.price_cents is null or l.price_cents <= p_max_price_cents)
  order by l.featured_score desc, l.published_at desc nulls last
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
$$;

drop function if exists public.search_listings_by_radius(
  text,
  double precision,
  double precision,
  integer,
  text[],
  numeric,
  integer,
  integer,
  integer
);

create function public.search_listings_by_radius(
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
  public_boundary_geojson jsonb,
  area_acres numeric,
  area_hectares numeric,
  area_display_source text,
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
    public.make_public_boundary_preview(l.land_boundary, l.exact_point, l.public_point),
    coalesce(l.reported_area_acres, l.area_acres),
    coalesce(l.reported_area_hectares, l.area_hectares),
    coalesce(l.area_display_source, 'drawn_boundary'),
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
    and (p_min_area_acres is null or coalesce(l.reported_area_acres, l.area_acres) >= p_min_area_acres)
    and (p_max_price_cents is null or l.price_cents is null or l.price_cents <= p_max_price_cents)
  order by l.featured_score desc, st_distance(l.exact_point, origin.geog), l.published_at desc nulls last
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
$$;

drop function if exists public.search_listings_in_bounds(
  double precision,
  double precision,
  double precision,
  double precision,
  text,
  text[],
  numeric,
  integer,
  integer,
  integer
);

create function public.search_listings_in_bounds(
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
  public_boundary_geojson jsonb,
  area_acres numeric,
  area_hectares numeric,
  area_display_source text,
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
    public.make_public_boundary_preview(l.land_boundary, l.exact_point, l.public_point),
    coalesce(l.reported_area_acres, l.area_acres),
    coalesce(l.reported_area_hectares, l.area_hectares),
    coalesce(l.area_display_source, 'drawn_boundary'),
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
    and (p_min_area_acres is null or coalesce(l.reported_area_acres, l.area_acres) >= p_min_area_acres)
    and (p_max_price_cents is null or l.price_cents is null or l.price_cents <= p_max_price_cents)
  order by l.featured_score desc, l.published_at desc nulls last
  limit least(greatest(p_limit, 1), 250)
  offset greatest(p_offset, 0);
$$;

drop function if exists public.get_featured_listings_by_region(
  text,
  text,
  text,
  integer
);

create function public.get_featured_listings_by_region(
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
  public_boundary_geojson jsonb,
  area_acres numeric,
  area_hectares numeric,
  area_display_source text,
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
    public.make_public_boundary_preview(l.land_boundary, l.exact_point, l.public_point),
    coalesce(l.reported_area_acres, l.area_acres),
    coalesce(l.reported_area_hectares, l.area_hectares),
    coalesce(l.area_display_source, 'drawn_boundary'),
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

drop function if exists public.get_listing_public_detail(text);

create function public.get_listing_public_detail(p_slug text)
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
  public_boundary_geojson jsonb,
  area_acres numeric,
  area_hectares numeric,
  area_display_source text,
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
    public.make_public_boundary_preview(l.land_boundary, l.exact_point, l.public_point),
    coalesce(l.reported_area_acres, l.area_acres),
    coalesce(l.reported_area_hectares, l.area_hectares),
    coalesce(l.area_display_source, 'drawn_boundary'),
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

grant execute on function public.make_public_boundary_preview(extensions.geometry, extensions.geography, extensions.geography) to anon, authenticated, service_role;
grant execute on function public.search_listings_by_region(text, text, text[], numeric, integer, integer, integer) to anon, authenticated, service_role;
grant execute on function public.search_listings_by_radius(text, double precision, double precision, integer, text[], numeric, integer, integer, integer) to anon, authenticated, service_role;
grant execute on function public.search_listings_in_bounds(double precision, double precision, double precision, double precision, text, text[], numeric, integer, integer, integer) to anon, authenticated, service_role;
grant execute on function public.get_featured_listings_by_region(text, text, text, integer) to anon, authenticated, service_role;
grant execute on function public.get_listing_public_detail(text) to anon, authenticated, service_role;
