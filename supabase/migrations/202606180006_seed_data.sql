-- Baseline marketplace configuration and public SEO region seeds.

insert into public.listing_types (slug, label, description, sort_order)
values
  ('day-access', 'Day access', 'Single-day or short-window access for vetted hunters.', 10),
  ('season-lease', 'Season lease', 'Seasonal hunting access for an agreed species, area, and date range.', 20),
  ('guided-hunt', 'Guided hunt', 'Land access packaged with local guide services or outfitter support.', 30),
  ('management-hunt', 'Management hunt', 'Selective harvest access for land management goals.', 40),
  ('exclusive-lease', 'Exclusive lease', 'Private access rights for a defined property and season.', 50)
on conflict (slug) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order,
    active = true;

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
  ('US', 'United States', 'united-states', null, null, null, 25000, true, 'Hunters are responsible for federal, state, and local licensing and firearm transport compliance.', 'Exact parcel boundaries are shared only after landowner approval or confirmed booking.', 3, 'Hunting leases in the United States', 'Find private hunting land access, day hunts, and seasonal leases across the United States.'),
  ('US', 'United States', 'united-states', 'TX', 'Texas', 'texas', 30000, true, 'Texas hunting license, hunter education, species tags, and local firearm rules may apply.', 'Respect landowner rules, game laws, county ordinances, and posted access windows.', 5, 'Texas hunting leases and private land access', 'Search private hunting leases, ranch access, day hunts, and seasonal land opportunities in Texas.'),
  ('US', 'United States', 'united-states', 'MT', 'Montana', 'montana', 35000, true, 'Montana license, conservation license, species tags, and block management rules may apply.', 'Access is conditional on landowner approval, route instructions, and seasonal restrictions.', 7, 'Montana hunting leases and ranch access', 'Explore vetted hunting access and lease opportunities across Montana.'),
  ('US', 'United States', 'united-states', 'CO', 'Colorado', 'colorado', 30000, true, 'Colorado license, habitat stamp, draw rules, unit restrictions, and firearm rules may apply.', 'Access approvals must match dates, species, party size, and property rules.', 7, 'Colorado private hunting land access', 'Find private hunting access and lease opportunities near Colorado hunting units.'),
  ('DE', 'Germany', 'germany', null, null, null, 20000, true, 'German hunting access is subject to Jagdschein, weapon law, lease district, and local authority requirements.', 'Listings are discovery leads only until legal access terms are verified by both parties.', 14, 'Hunting access in Germany', 'Discover hunting access opportunities and lease-style arrangements in Germany.'),
  ('ZA', 'South Africa', 'south-africa', null, null, null, 30000, true, 'Provincial permits, outfitter rules, firearm import permits, and species-specific rules may apply.', 'Exact locations and farm boundaries are disclosed only after approval or confirmed booking.', 10, 'South Africa hunting land access', 'Find private land and outfitter-linked hunting access in South Africa.'),
  ('NA', 'Namibia', 'namibia', null, null, null, 40000, true, 'Namibian hunting permits, professional hunter requirements, and firearms import rules may apply.', 'Coordinate all access, species, and transport requirements directly with the landowner or outfitter.', 14, 'Namibia hunting access and concessions', 'Explore hunting access opportunities across Namibia with privacy-first map discovery.'),
  ('NZ', 'New Zealand', 'new-zealand', null, null, null, 25000, true, 'Firearms licensing, DOC rules, landowner permissions, and regional regulations may apply.', 'Exact access points remain private until approval or confirmed booking.', 7, 'New Zealand hunting access', 'Find private hunting access and landowner-approved opportunities in New Zealand.'),
  ('ES', 'Spain', 'spain', null, null, null, 25000, true, 'Spanish hunting access is subject to regional licenses, insurance, firearm permits, and reserve rules.', 'Region-specific rules must be confirmed before any booking is final.', 10, 'Spain hunting leases and access', 'Search private hunting access and regional opportunities across Spain.')
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
