-- Indexes, grants, and RLS policies.

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists legal_region_country_idx on public.legal_region_configs (country_slug, admin_area_slug);
create index if not exists listings_status_region_idx on public.listings (status, country_code, admin_area_code, region_slug);
create index if not exists listings_owner_idx on public.listings (owner_id);
create index if not exists listings_type_idx on public.listings (listing_type_id);
create index if not exists listings_featured_idx on public.listings (status, featured_score desc, published_at desc);
create index if not exists listings_land_boundary_gix on public.listings using gist (land_boundary);
create index if not exists listings_exact_point_gix on public.listings using gist (exact_point);
create index if not exists listings_public_point_gix on public.listings using gist (public_point);
create index if not exists listings_search_document_gin on public.listings using gin (search_document);
create index if not exists listings_title_trgm on public.listings using gin (title gin_trgm_ops);
create index if not exists listing_images_listing_idx on public.listing_images (listing_id, sort_order);
create index if not exists listing_requests_listing_idx on public.listing_requests (listing_id, status, created_at desc);
create index if not exists listing_requests_hunter_idx on public.listing_requests (hunter_id, status, created_at desc);
create index if not exists bookings_listing_dates_idx on public.bookings (listing_id, starts_on, ends_on);
create index if not exists bookings_hunter_idx on public.bookings (hunter_id, status);
create index if not exists bookings_landowner_idx on public.bookings (landowner_id, status);
create index if not exists messages_recipient_idx on public.messages (recipient_id, read_at, created_at desc);
create index if not exists favorites_listing_idx on public.favorites (listing_id);
create index if not exists saved_searches_center_gix on public.saved_searches using gist (center);
create index if not exists saved_searches_bounds_gix on public.saved_searches using gist (bounds);

alter table public.profiles enable row level security;
alter table public.legal_region_configs enable row level security;
alter table public.listing_types enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.listing_requests enable row level security;
alter table public.bookings enable row level security;
alter table public.messages enable row level security;
alter table public.favorites enable row level security;
alter table public.saved_searches enable row level security;
alter table public.admin_reviews enable row level security;
alter table public.contact_messages enable row level security;

create or replace function public.is_admin(actor_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = actor_id and role = 'admin'
  );
$$;

create or replace function public.can_view_listing_exact_location(
  p_listing_id uuid,
  actor_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select actor_id is not null and (
    public.is_admin(actor_id)
    or exists (
      select 1 from public.listings
      where id = p_listing_id and owner_id = actor_id
    )
    or exists (
      select 1 from public.listing_requests
      where listing_id = p_listing_id
        and hunter_id = actor_id
        and status = 'approved'
    )
    or exists (
      select 1 from public.bookings
      where listing_id = p_listing_id
        and hunter_id = actor_id
        and status in ('confirmed', 'completed')
    )
  );
$$;

drop policy if exists "Profiles are readable by authenticated users" on public.profiles;
create policy "Profiles are readable by authenticated users"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "Public legal configs are readable" on public.legal_region_configs;
create policy "Public legal configs are readable"
on public.legal_region_configs for select
to anon, authenticated
using (market_enabled);

drop policy if exists "Public listing types are readable" on public.listing_types;
create policy "Public listing types are readable"
on public.listing_types for select
to anon, authenticated
using (active);

drop policy if exists "Approved listings are publicly readable" on public.listings;
create policy "Approved listings are publicly readable"
on public.listings for select
to anon, authenticated
using (status = 'approved' or owner_id = auth.uid() or public.is_admin());

drop policy if exists "Landowners can create listings" on public.listings;
create policy "Landowners can create listings"
on public.listings for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "Owners can update own listings" on public.listings;
create policy "Owners can update own listings"
on public.listings for update
to authenticated
using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists "Listing images follow listing visibility" on public.listing_images;
create policy "Listing images follow listing visibility"
on public.listing_images for select
to anon, authenticated
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_id
      and (l.status = 'approved' or l.owner_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "Owners manage listing images" on public.listing_images;
create policy "Owners manage listing images"
on public.listing_images for all
to authenticated
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_id and (l.owner_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1 from public.listings l
    where l.id = listing_id and (l.owner_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "Request parties can read requests" on public.listing_requests;
create policy "Request parties can read requests"
on public.listing_requests for select
to authenticated
using (
  hunter_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.listings l
    where l.id = listing_id and l.owner_id = auth.uid()
  )
);

drop policy if exists "Hunters can create listing requests" on public.listing_requests;
create policy "Hunters can create listing requests"
on public.listing_requests for insert
to authenticated
with check (hunter_id = auth.uid());

drop policy if exists "Request parties can update requests" on public.listing_requests;
create policy "Request parties can update requests"
on public.listing_requests for update
to authenticated
using (
  hunter_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.listings l
    where l.id = listing_id and l.owner_id = auth.uid()
  )
)
with check (
  hunter_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.listings l
    where l.id = listing_id and l.owner_id = auth.uid()
  )
);

drop policy if exists "Booking parties can read bookings" on public.bookings;
create policy "Booking parties can read bookings"
on public.bookings for select
to authenticated
using (hunter_id = auth.uid() or landowner_id = auth.uid() or public.is_admin());

drop policy if exists "Booking parties can manage bookings" on public.bookings;
create policy "Booking parties can manage bookings"
on public.bookings for all
to authenticated
using (hunter_id = auth.uid() or landowner_id = auth.uid() or public.is_admin())
with check (hunter_id = auth.uid() or landowner_id = auth.uid() or public.is_admin());

drop policy if exists "Message parties can read messages" on public.messages;
create policy "Message parties can read messages"
on public.messages for select
to authenticated
using (sender_id = auth.uid() or recipient_id = auth.uid() or public.is_admin());

drop policy if exists "Authenticated users can send own messages" on public.messages;
create policy "Authenticated users can send own messages"
on public.messages for insert
to authenticated
with check (sender_id = auth.uid());

drop policy if exists "Users manage own favorites" on public.favorites;
create policy "Users manage own favorites"
on public.favorites for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users manage own saved searches" on public.saved_searches;
create policy "Users manage own saved searches"
on public.saved_searches for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Admins manage reviews" on public.admin_reviews;
create policy "Admins manage reviews"
on public.admin_reviews for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Anyone can submit contact messages" on public.contact_messages;
create policy "Anyone can submit contact messages"
on public.contact_messages for insert
to anon, authenticated
with check (true);

revoke all on public.listings from anon, authenticated;
grant select (
  id, owner_id, listing_type_id, status, title, slug, summary, description,
  country_code, country_name, admin_area_code, admin_area_name, region_name,
  region_slug, nearest_town, public_point, area_acres, area_hectares, wildlife,
  amenities, rules, price_cents, currency, price_unit, cover_image_path,
  available_from, available_to, featured_score, published_at, created_at, updated_at
) on public.listings to anon, authenticated;
grant insert (
  owner_id, listing_type_id, status, title, slug, summary, description,
  country_code, country_name, admin_area_code, admin_area_name, region_name,
  region_slug, nearest_town, address_private, boundary_geojson, wildlife,
  amenities, rules, price_cents, currency, price_unit, cover_image_path,
  available_from, available_to
) on public.listings to authenticated;
grant update (
  listing_type_id, status, title, slug, summary, description, country_code,
  country_name, admin_area_code, admin_area_name, region_name, region_slug,
  nearest_town, address_private, boundary_geojson, wildlife, amenities, rules,
  price_cents, currency, price_unit, cover_image_path, available_from,
  available_to, rejection_reason
) on public.listings to authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, avatar_url, phone, country_code, onboarding_completed, marketing_consent) on public.profiles to authenticated;
grant insert (id, full_name, avatar_url, phone, country_code, onboarding_completed, marketing_consent) on public.profiles to authenticated;
grant select on public.legal_region_configs to anon, authenticated;
grant select on public.listing_types to anon, authenticated;
grant select, insert, update, delete on public.listing_images to authenticated;
grant select on public.listing_images to anon;
grant select, insert, update on public.listing_requests to authenticated;
grant select, insert, update on public.bookings to authenticated;
grant select, insert, update on public.messages to authenticated;
grant select, insert, update, delete on public.favorites to authenticated;
grant select, insert, update, delete on public.saved_searches to authenticated;
grant select, insert, update on public.admin_reviews to authenticated;
grant insert on public.contact_messages to anon, authenticated;
grant all on all tables in schema public to service_role;
grant usage on schema public to anon, authenticated, service_role;
