-- Final demo inventory reset.
-- This intentionally removes all existing listing-related data and inserts
-- three polished approved US listings that match the production UX.

delete from public.contract_signatures
where contract_id in (select id from public.booking_contracts);

delete from public.booking_workflow_events;
delete from public.booking_contracts;
delete from public.messages;
delete from public.bookings;
delete from public.listing_requests;
delete from public.favorites;
delete from public.admin_reviews;
delete from public.listing_images;
delete from public.listing_compliance_profiles;
delete from public.property_verifications where listing_id is not null;
delete from public.listings;

insert into public.legal_region_configs (
  country_code,
  country_name,
  country_slug,
  admin_area_code,
  admin_area_name,
  admin_area_slug,
  public_location_precision_meters,
  hunter_permit_required,
  firearm_notice,
  access_terms,
  min_booking_notice_days,
  seo_title,
  seo_description
)
values
  ('US', 'United States', 'united-states', 'GA', 'Georgia', 'georgia', 25000, true, 'Georgia hunting license, hunter education, private land permission, harvest reporting, and species rules may apply.', 'Private land access is granted only after landowner approval and signed access terms.', 5, 'Georgia hunting leases and private hunting land', 'Find Georgia hunting leases, timber access, whitetail leases, turkey hunting land, and landowner-approved private access.'),
  ('US', 'United States', 'united-states', 'TX', 'Texas', 'texas', 30000, true, 'Texas hunting license, hunter education, species tags, public road rules, and county firearm rules may apply.', 'Respect landowner rules, game laws, county ordinances, and posted access windows.', 5, 'Texas hunting leases and private ranch access', 'Search Texas hunting leases, private ranch access, whitetail leases, mule deer leases, quail country, and seasonal hunting land.'),
  ('US', 'United States', 'united-states', 'MT', 'Montana', 'montana', 35000, true, 'Montana conservation license, hunting license, species tags, access rules, and private land permission may apply.', 'Access is conditional on landowner approval, route instructions, and seasonal restrictions.', 7, 'Montana hunting leases and private ranch access', 'Explore Montana hunting leases, elk access, mountain ranch properties, and landowner-approved private hunting opportunities.')
on conflict (country_code, admin_area_code) do update
set country_name = excluded.country_name,
    country_slug = excluded.country_slug,
    admin_area_name = excluded.admin_area_name,
    admin_area_slug = excluded.admin_area_slug,
    public_location_precision_meters = excluded.public_location_precision_meters,
    hunter_permit_required = excluded.hunter_permit_required,
    firearm_notice = excluded.firearm_notice,
    access_terms = excluded.access_terms,
    min_booking_notice_days = excluded.min_booking_notice_days,
    seo_title = excluded.seo_title,
    seo_description = excluded.seo_description,
    market_enabled = true;

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '11111111-1111-4111-8111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'demo-landowner@huntfields.local',
  extensions.crypt('huntfields-demo-password', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Huntfields Demo Landowner"}',
  now(),
  now()
)
on conflict (id) do update
set email = excluded.email,
    raw_user_meta_data = excluded.raw_user_meta_data,
    updated_at = now();

insert into public.profiles (id, role, full_name, country_code, onboarding_completed)
values (
  '11111111-1111-4111-8111-111111111111',
  'landowner',
  'Huntfields Verified Landowner',
  'US',
  true
)
on conflict (id) do update
set role = 'landowner',
    full_name = excluded.full_name,
    country_code = excluded.country_code,
    onboarding_completed = true;

insert into public.listings (
  id,
  owner_id,
  listing_type_id,
  status,
  title,
  slug,
  summary,
  description,
  country_code,
  country_name,
  admin_area_code,
  admin_area_name,
  region_name,
  region_slug,
  nearest_town,
  address_private,
  boundary_geojson,
  reported_area_acres,
  wildlife,
  amenities,
  rules,
  price_cents,
  currency,
  price_unit,
  cover_image_path,
  available_from,
  available_to,
  featured_score,
  published_at
)
values
  (
    '44444444-4444-4444-8444-444444444441',
    '11111111-1111-4111-8111-111111111111',
    (select id from public.listing_types where slug = 'season-lease'),
    'approved',
    'Georgia Flint River Timber Whitetail Lease',
    'georgia-flint-river-timber-whitetail-lease',
    'A private timber and creek-bottom season lease with whitetail, turkey, hog movement, food plots, and controlled access near Albany.',
    'This is a quiet timber tract set up for a small, respectful hunting party that wants a full-season place to learn. The land has a practical mix of pine cover, hardwood drains, food plots, and creek-bottom movement, with enough separation to hunt different wind directions without crowding the property. It is best suited for hunters who value communication, clean access, and clear expectations more than a crowded club atmosphere. Exact gates, route notes, stand zones, and the owner-drawn boundary are shared only after approval and signed access terms.',
    'US',
    'United States',
    'GA',
    'Georgia',
    'Flint River timber country',
    'united-states/georgia',
    'Albany',
    'Private timber access road shared after approval',
    '{"type":"Polygon","coordinates":[[[-84.459,31.702],[-84.392,31.718],[-84.358,31.676],[-84.376,31.622],[-84.447,31.614],[-84.481,31.658],[-84.459,31.702]]]}',
    680,
    array['whitetail deer', 'wild turkey', 'feral hogs'],
    array['food plots', 'hardwood drains', 'creek crossing', 'gated access', 'stand zones'],
    array['check-in before entry', 'no guests without approval', 'harvest reporting required', 'use marked access routes'],
    540000,
    'USD',
    'per_season',
    '/images/listings/georgia-flint-river-whitetail-turkey-lease.jpg',
    '2026-09-01',
    '2027-01-31',
    99,
    now()
  ),
  (
    '44444444-4444-4444-8444-444444444442',
    '11111111-1111-4111-8111-111111111111',
    (select id from public.listing_types where slug = 'exclusive-lease'),
    'approved',
    'Texas Panhandle Mule Deer and Quail Ranch Lease',
    'texas-panhandle-mule-deer-quail-ranch-lease',
    'An exclusive Panhandle ranch lease with broken grassland, draws, water, quail cover, and mule deer habitat near Canadian.',
    'This Panhandle lease is built for hunters who want room to move, glass, and manage pressure carefully. The ranch block has broken grassland, draws, water, senderos, and upland cover that can support a serious deer and quail plan across the season. The owner is looking for a responsible party that understands ranch roads, gates, livestock awareness, and written rules. Public visitors see enough to judge the opportunity, but exact roads, gates, water points, and detailed boundary geometry remain private until the landowner approves the party and terms.',
    'US',
    'United States',
    'TX',
    'Texas',
    'Texas Panhandle ranch country',
    'united-states/texas',
    'Canadian',
    'Ranch entrance shared after approval',
    '{"type":"Polygon","coordinates":[[[-100.506,35.958],[-100.397,35.972],[-100.352,35.923],[-100.369,35.842],[-100.478,35.828],[-100.529,35.889],[-100.506,35.958]]]}',
    2450,
    array['mule deer', 'whitetail deer', 'bobwhite quail', 'feral hogs'],
    array['water', 'senderos', 'ranch roads', 'blind locations', 'camp staging area'],
    array['use marked ranch roads only', 'no night hunting', 'all guests must be approved', 'close every gate'],
    980000,
    'USD',
    'per_season',
    '/images/listings/texas-panhandle-mule-deer-quail-lease.jpg',
    '2026-09-15',
    '2027-01-15',
    96,
    now()
  ),
  (
    '44444444-4444-4444-8444-444444444443',
    '11111111-1111-4111-8111-111111111111',
    (select id from public.listing_types where slug = 'guided-hunt'),
    'approved',
    'Montana Bitterroot Elk and Black Bear Guided Access',
    'montana-bitterroot-elk-black-bear-guided-access',
    'A guided mountain access package with timber benches, meadow edges, glassing points, and controlled approach routes near Hamilton.',
    'This guided Bitterroot access is for hunters who want mountain terrain with a clear point of contact before they arrive. The area includes timber benches, meadow edges, glassing points, and seasonal approach routes that require planning around weather and access conditions. It is a good fit for hunters who are comfortable with elevation, changing conditions, and guide orientation. The public listing gives a realistic sense of habitat and scale, while final coordinates, route instructions, gate details, and guide contact information are released only after approval and signature.',
    'US',
    'United States',
    'MT',
    'Montana',
    'Bitterroot Valley',
    'united-states/montana',
    'Hamilton',
    'Private mountain access point shared after approval',
    '{"type":"Polygon","coordinates":[[[-114.336,46.374],[-114.232,46.392],[-114.169,46.341],[-114.194,46.262],[-114.306,46.253],[-114.367,46.309],[-114.336,46.374]]]}',
    3200,
    array['elk', 'mule deer', 'black bear'],
    array['guided support', 'glassing points', 'seasonal two-track access', 'camp staging area', 'water nearby'],
    array['guide orientation required', 'no off-route driving', 'pack out all trash', 'weather access may change'],
    680000,
    'USD',
    'per_week',
    '/images/listings/montana-bitterroot-elk-black-bear-access.jpg',
    '2026-09-01',
    '2026-11-30',
    93,
    now()
  );

insert into public.listing_compliance_profiles (
  listing_id,
  state_code,
  landowner_has_authority,
  hunting_lease_license_required,
  hunting_lease_license_number,
  insurance_required,
  insurance_summary,
  allowed_species,
  allowed_methods,
  prohibited_methods,
  guest_policy,
  vehicle_policy,
  alcohol_policy,
  emergency_contact_name,
  emergency_contact_phone,
  state_specific_answers
)
values
  (
    '44444444-4444-4444-8444-444444444441',
    'GA',
    true,
    false,
    null,
    true,
    'Proof of liability coverage or signed waiver may be requested before access details are released.',
    array['whitetail deer', 'wild turkey', 'feral hogs'],
    array['rifle', 'archery'],
    array['unapproved guests', 'driving off marked routes', 'littering'],
    'Approved party only; guests require written owner approval.',
    'Use marked access routes and avoid wet-road closures.',
    'No alcohol while hunting or handling firearms.',
    'Property manager',
    '+1 229 555 0144',
    '{"demo": true, "final_inventory": true}'
  ),
  (
    '44444444-4444-4444-8444-444444444442',
    'TX',
    true,
    true,
    'TX-DEMO-LEASE-9102',
    true,
    'Landowner requires signed waiver and may request proof of hunting liability coverage.',
    array['mule deer', 'whitetail deer', 'bobwhite quail', 'feral hogs'],
    array['rifle', 'archery', 'shotgun'],
    array['night hunting', 'unapproved vehicles', 'open gates'],
    'Maximum approved party only; all hunters must be named before arrival.',
    'Use marked ranch roads only; no off-route driving.',
    'No alcohol while hunting, driving access roads, or handling firearms.',
    'Ranch manager',
    '+1 806 555 0198',
    '{"demo": true, "final_inventory": true}'
  ),
  (
    '44444444-4444-4444-8444-444444444443',
    'MT',
    true,
    false,
    null,
    true,
    'Guided access includes orientation, signed rules packet, and emergency plan.',
    array['elk', 'mule deer', 'black bear'],
    array['rifle', 'archery'],
    array['off-route driving', 'campfires outside approved area', 'leaving gates open'],
    'Guide confirms party composition before arrival.',
    'Seasonal access only; high-clearance vehicle may be required.',
    'No alcohol while hunting or handling firearms.',
    'Outfitter contact',
    '+1 406 555 0177',
    '{"demo": true, "final_inventory": true}'
  );
