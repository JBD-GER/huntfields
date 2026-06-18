-- Huntfields production schema.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'hunter',
  full_name text,
  avatar_url text,
  phone text,
  country_code char(2),
  onboarding_completed boolean not null default false,
  marketing_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.legal_region_configs (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null,
  country_name text not null,
  country_slug text not null,
  admin_area_code text,
  admin_area_name text,
  admin_area_slug text,
  region_slug text generated always as (
    case
      when admin_area_slug is null then country_slug
      else country_slug || '/' || admin_area_slug
    end
  ) stored,
  market_enabled boolean not null default true,
  public_location_precision_meters integer not null default 25000,
  hunter_permit_required boolean not null default true,
  firearm_notice text,
  access_terms text,
  min_booking_notice_days integer not null default 3,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint legal_region_configs_country_area_unique unique nulls not distinct (country_code, admin_area_code)
);

create trigger legal_region_configs_set_updated_at
before update on public.legal_region_configs
for each row execute function public.set_updated_at();

create table if not exists public.listing_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  description text not null,
  sort_order integer not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  listing_type_id uuid not null references public.listing_types(id),
  status public.listing_status not null default 'draft',
  title text not null,
  slug text not null unique,
  summary text not null,
  description text,
  country_code char(2) not null,
  country_name text not null,
  admin_area_code text,
  admin_area_name text,
  region_name text,
  region_slug text not null,
  nearest_town text,
  address_private text,
  boundary_geojson jsonb not null,
  land_boundary geometry(MultiPolygon, 4326) not null,
  exact_point geography(Point, 4326) not null,
  public_point geography(Point, 4326) not null,
  area_acres numeric(12, 2) not null default 0,
  area_hectares numeric(12, 2) not null default 0,
  wildlife text[] not null default '{}',
  amenities text[] not null default '{}',
  rules text[] not null default '{}',
  price_cents integer,
  currency char(3) not null default 'USD',
  price_unit public.price_unit not null default 'per_day',
  cover_image_path text,
  available_from date,
  available_to date,
  featured_score integer not null default 0,
  submitted_at timestamptz,
  published_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  rejection_reason text,
  search_document tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listings_price_positive check (price_cents is null or price_cents >= 0),
  constraint listings_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create or replace function public.normalize_listing_geography()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
declare
  geom geometry;
  centroid geometry(Point, 4326);
begin
  if new.boundary_geojson is null then
    raise exception 'boundary_geojson is required';
  end if;

  geom := st_setsrid(st_geomfromgeojson(new.boundary_geojson::text), 4326);
  geom := st_makevalid(geom);

  if geometrytype(geom) = 'POLYGON' then
    geom := st_multi(geom);
  end if;

  if geometrytype(geom) <> 'MULTIPOLYGON' then
    raise exception 'boundary_geojson must be a Polygon or MultiPolygon';
  end if;

  centroid := st_centroid(geom)::geometry(Point, 4326);

  new.land_boundary := geom::geometry(MultiPolygon, 4326);
  new.exact_point := centroid::geography;
  new.public_point := st_setsrid(
    st_makepoint(
      round(st_x(centroid)::numeric, 1)::double precision,
      round(st_y(centroid)::numeric, 1)::double precision
    ),
    4326
  )::geography;
  new.area_hectares := round((st_area(geom::geography) / 10000.0)::numeric, 2);
  new.area_acres := round((st_area(geom::geography) / 4046.8564224)::numeric, 2);
  new.region_slug := lower(regexp_replace(new.region_slug, '[^a-z0-9/-]+', '-', 'g'));
  new.slug := lower(regexp_replace(new.slug, '[^a-z0-9-]+', '-', 'g'));
  new.search_document := to_tsvector(
    'simple',
    concat_ws(
      ' ',
      new.title,
      new.summary,
      new.description,
      new.country_name,
      new.admin_area_name,
      new.region_name,
      new.nearest_town,
      array_to_string(new.wildlife, ' '),
      array_to_string(new.amenities, ' ')
    )
  );

  if new.status = 'submitted' and (tg_op = 'INSERT' or old.status is distinct from 'submitted') then
    new.submitted_at := coalesce(new.submitted_at, now());
  end if;

  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    new.published_at := coalesce(new.published_at, now());
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger listings_normalize_geography
before insert or update on public.listings
for each row execute function public.normalize_listing_geography();

create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  storage_path text not null,
  alt text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (listing_id, storage_path)
);

create table if not exists public.listing_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  hunter_id uuid not null references public.profiles(id) on delete cascade,
  status public.request_status not null default 'pending',
  requested_start date,
  requested_end date,
  party_size integer not null default 1,
  message text,
  response_message text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listing_requests_party_size_positive check (party_size > 0)
);

create trigger listing_requests_set_updated_at
before update on public.listing_requests
for each row execute function public.set_updated_at();

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  request_id uuid unique references public.listing_requests(id) on delete set null,
  listing_id uuid not null references public.listings(id) on delete cascade,
  hunter_id uuid not null references public.profiles(id) on delete cascade,
  landowner_id uuid not null references public.profiles(id) on delete cascade,
  status public.booking_status not null default 'pending_payment',
  starts_on date not null,
  ends_on date not null,
  amount_cents integer,
  currency char(3) not null default 'USD',
  payment_provider public.payment_provider not null default 'manual',
  provider_checkout_id text,
  provider_payment_id text,
  checkout_url text,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_valid_dates check (ends_on >= starts_on),
  constraint bookings_amount_positive check (amount_cents is null or amount_cents >= 0)
);

create trigger bookings_set_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.listing_requests(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint messages_context_present check (request_id is not null or booking_id is not null)
);

create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  country_code char(2),
  admin_area_code text,
  region_slug text,
  center geography(Point, 4326),
  radius_meters integer,
  bounds geometry(Polygon, 4326),
  filters jsonb not null default '{}',
  email_alerts_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger saved_searches_set_updated_at
before update on public.saved_searches
for each row execute function public.set_updated_at();

create table if not exists public.admin_reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  reviewer_id uuid references public.profiles(id) on delete set null,
  status public.admin_review_status not null default 'needs_review',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  topic text not null,
  message text not null,
  created_at timestamptz not null default now()
);
