-- US-first compliance, booking workflow, and electronic lease contract support.

do $$ begin
  create type public.contract_status as enum ('draft', 'sent', 'partially_signed', 'signed', 'voided');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.contract_signer_role as enum ('hunter', 'landowner');
exception when duplicate_object then null;
end $$;

create table if not exists public.us_state_hunting_rules (
  state_code char(2) primary key,
  state_name text not null,
  agency_name text not null,
  agency_url text not null,
  license_summary text not null,
  hunter_education_summary text not null,
  private_land_permission_summary text not null,
  lease_license_summary text,
  hunter_orange_summary text,
  landowner_listing_requirements jsonb not null default '[]',
  hunter_attestations jsonb not null default '[]',
  booking_checklist jsonb not null default '[]',
  contract_clauses jsonb not null default '[]',
  source_urls text[] not null default '{}',
  active boolean not null default true,
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger us_state_hunting_rules_set_updated_at
before update on public.us_state_hunting_rules
for each row execute function public.set_updated_at();

create table if not exists public.hunter_compliance_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  legal_first_name text not null,
  legal_last_name text not null,
  date_of_birth date not null,
  residency_country_code char(2) not null default 'US',
  residency_state_code char(2),
  hunter_education_completed boolean not null default false,
  hunter_education_state_code char(2),
  hunter_education_number text,
  hunting_license_state_code char(2),
  hunting_license_number text,
  hunting_license_expires_on date,
  electronic_records_consent boolean not null default false,
  rules_acknowledged boolean not null default false,
  liability_waiver_acknowledged boolean not null default false,
  attestations jsonb not null default '{}',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hunter_compliance_adult_check check (date_of_birth <= current_date)
);

create trigger hunter_compliance_profiles_set_updated_at
before update on public.hunter_compliance_profiles
for each row execute function public.set_updated_at();

create table if not exists public.listing_compliance_profiles (
  listing_id uuid primary key references public.listings(id) on delete cascade,
  state_code char(2),
  landowner_has_authority boolean not null default false,
  hunting_lease_license_required boolean not null default false,
  hunting_lease_license_number text,
  insurance_required boolean not null default false,
  insurance_summary text,
  allowed_species text[] not null default '{}',
  allowed_methods text[] not null default '{}',
  prohibited_methods text[] not null default '{}',
  guest_policy text,
  vehicle_policy text,
  alcohol_policy text,
  emergency_contact_name text,
  emergency_contact_phone text,
  state_specific_answers jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger listing_compliance_profiles_set_updated_at
before update on public.listing_compliance_profiles
for each row execute function public.set_updated_at();

create table if not exists public.booking_contracts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  request_id uuid references public.listing_requests(id) on delete set null,
  listing_id uuid not null references public.listings(id) on delete cascade,
  hunter_id uuid not null references public.profiles(id) on delete cascade,
  landowner_id uuid not null references public.profiles(id) on delete cascade,
  status public.contract_status not null default 'draft',
  contract_version text not null default 'huntfields-us-lease-v1',
  title text not null,
  contract_html text not null,
  contract_text text not null,
  contract_hash text not null,
  electronic_records_disclosure text not null,
  source_rule_state_code char(2),
  generated_at timestamptz not null default now(),
  sent_at timestamptz,
  signed_at timestamptz,
  voided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger booking_contracts_set_updated_at
before update on public.booking_contracts
for each row execute function public.set_updated_at();

create table if not exists public.contract_signatures (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.booking_contracts(id) on delete cascade,
  signer_id uuid not null references public.profiles(id) on delete cascade,
  signer_role public.contract_signer_role not null,
  typed_name text not null,
  electronic_records_consent boolean not null,
  ip_address inet,
  user_agent text,
  signed_at timestamptz not null default now(),
  unique (contract_id, signer_id)
);

create table if not exists public.booking_workflow_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade,
  request_id uuid references public.listing_requests(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists hunter_compliance_license_idx
  on public.hunter_compliance_profiles (hunting_license_state_code, hunting_license_expires_on);
create index if not exists listing_compliance_state_idx
  on public.listing_compliance_profiles (state_code);
create index if not exists booking_contracts_booking_idx
  on public.booking_contracts (booking_id, status);
create index if not exists booking_contracts_party_idx
  on public.booking_contracts (hunter_id, landowner_id, status);
create index if not exists contract_signatures_contract_idx
  on public.contract_signatures (contract_id, signer_role);
create index if not exists booking_workflow_events_booking_idx
  on public.booking_workflow_events (booking_id, created_at desc);

alter table public.us_state_hunting_rules enable row level security;
alter table public.hunter_compliance_profiles enable row level security;
alter table public.listing_compliance_profiles enable row level security;
alter table public.booking_contracts enable row level security;
alter table public.contract_signatures enable row level security;
alter table public.booking_workflow_events enable row level security;

drop policy if exists "Active US state rules are public" on public.us_state_hunting_rules;
create policy "Active US state rules are public"
on public.us_state_hunting_rules for select
to anon, authenticated
using (active);

drop policy if exists "Hunters manage own compliance" on public.hunter_compliance_profiles;
create policy "Hunters manage own compliance"
on public.hunter_compliance_profiles for all
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Listing compliance follows listing parties" on public.listing_compliance_profiles;
create policy "Listing compliance follows listing parties"
on public.listing_compliance_profiles for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.listings l
    where l.id = listing_id and l.owner_id = auth.uid()
  )
  or exists (
    select 1 from public.listing_requests r
    where r.listing_id = listing_id and r.hunter_id = auth.uid() and r.status = 'approved'
  )
);

drop policy if exists "Owners manage listing compliance" on public.listing_compliance_profiles;
create policy "Owners manage listing compliance"
on public.listing_compliance_profiles for all
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.listings l
    where l.id = listing_id and l.owner_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1 from public.listings l
    where l.id = listing_id and l.owner_id = auth.uid()
  )
);

drop policy if exists "Contract parties can read contracts" on public.booking_contracts;
create policy "Contract parties can read contracts"
on public.booking_contracts for select
to authenticated
using (hunter_id = auth.uid() or landowner_id = auth.uid() or public.is_admin());

drop policy if exists "Contract parties can read signatures" on public.contract_signatures;
create policy "Contract parties can read signatures"
on public.contract_signatures for select
to authenticated
using (
  public.is_admin()
  or signer_id = auth.uid()
  or exists (
    select 1 from public.booking_contracts c
    where c.id = contract_id
      and (c.hunter_id = auth.uid() or c.landowner_id = auth.uid())
  )
);

drop policy if exists "Contract parties can add own signature" on public.contract_signatures;
create policy "Contract parties can add own signature"
on public.contract_signatures for insert
to authenticated
with check (
  signer_id = auth.uid()
  and electronic_records_consent
  and exists (
    select 1 from public.booking_contracts c
    where c.id = contract_id
      and c.status in ('sent', 'partially_signed')
      and (c.hunter_id = auth.uid() or c.landowner_id = auth.uid())
  )
);

drop policy if exists "Workflow events visible to parties" on public.booking_workflow_events;
create policy "Workflow events visible to parties"
on public.booking_workflow_events for select
to authenticated
using (
  public.is_admin()
  or actor_id = auth.uid()
  or exists (
    select 1 from public.bookings b
    where b.id = booking_id
      and (b.hunter_id = auth.uid() or b.landowner_id = auth.uid())
  )
  or exists (
    select 1
    from public.listing_requests r
    join public.listings l on l.id = r.listing_id
    where r.id = request_id
      and (r.hunter_id = auth.uid() or l.owner_id = auth.uid())
  )
);

create or replace function public.get_us_state_hunting_rule(p_state_code text)
returns setof public.us_state_hunting_rules
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.us_state_hunting_rules
  where state_code = upper(p_state_code)::char(2)
    and active
  limit 1;
$$;

create or replace function public.refresh_contract_status(p_contract_id uuid)
returns public.contract_status
language plpgsql
security definer
set search_path = public
as $$
declare
  signature_count integer;
  next_status public.contract_status;
begin
  select count(*) into signature_count
  from public.contract_signatures
  where contract_id = p_contract_id;

  next_status := case
    when signature_count >= 2 then 'signed'::public.contract_status
    when signature_count = 1 then 'partially_signed'::public.contract_status
    else 'sent'::public.contract_status
  end;

  update public.booking_contracts
  set status = next_status,
      signed_at = case when next_status = 'signed' then coalesce(signed_at, now()) else signed_at end
  where id = p_contract_id;

  update public.bookings b
  set status = 'confirmed',
      confirmed_at = coalesce(confirmed_at, now())
  from public.booking_contracts c
  where c.id = p_contract_id
    and c.booking_id = b.id
    and next_status = 'signed';

  return next_status;
end;
$$;

grant select on public.us_state_hunting_rules to anon, authenticated;
grant select, insert, update on public.hunter_compliance_profiles to authenticated;
grant select, insert, update on public.listing_compliance_profiles to authenticated;
grant select on public.booking_contracts to authenticated;
grant select, insert on public.contract_signatures to authenticated;
grant select on public.booking_workflow_events to authenticated;
grant all on public.us_state_hunting_rules to service_role;
grant all on public.hunter_compliance_profiles to service_role;
grant all on public.listing_compliance_profiles to service_role;
grant all on public.booking_contracts to service_role;
grant all on public.contract_signatures to service_role;
grant all on public.booking_workflow_events to service_role;
grant execute on function public.get_us_state_hunting_rule(text) to anon, authenticated, service_role;
grant execute on function public.refresh_contract_status(uuid) to authenticated, service_role;

insert into public.us_state_hunting_rules (
  state_code,
  state_name,
  agency_name,
  agency_url,
  license_summary,
  hunter_education_summary,
  private_land_permission_summary,
  lease_license_summary,
  hunter_orange_summary,
  landowner_listing_requirements,
  hunter_attestations,
  booking_checklist,
  contract_clauses,
  source_urls
)
values
  (
    'TX',
    'Texas',
    'Texas Parks & Wildlife Department',
    'https://tpwd.texas.gov/',
    'Hunters must carry the appropriate Texas resident or non-resident hunting license and any required endorsements/tags for the species and season.',
    'Texas hunter education applies to hunters born on or after September 2, 1971; minimum certification age is 9, and approved deferral/supervision rules may apply.',
    'Private land hunting requires landowner permission and compliance with all county, season, tagging, method-of-take, and species rules.',
    'Texas requires landowners who lease private property for hunting compensation to obtain the appropriate TPWD Hunting Lease License based on acreage/category.',
    'Hunter orange requirements depend on land type, species, and season; hunters must verify current TPWD rules before hunting.',
    '["Landowner confirms authority to offer hunting access", "Landowner confirms whether a Texas Hunting Lease License is required", "If required, landowner enters lease license number before booking", "Property rules, access routes, emergency contact, allowed species, and allowed methods are provided"]',
    '["I will hold the required Texas hunting license, tags, permits, and endorsements before hunting", "I understand Texas hunter education/deferral rules may apply to me", "I will not enter the property until the landowner approves access and a lease agreement is signed", "I will verify current TPWD season, bag, county, and method rules before hunting"]',
    '["Verify hunter license and tags", "Verify Texas hunter education or legal exemption/deferral", "Confirm lease license if compensated private land access requires it", "Sign lease agreement electronically", "Share exact access point only after approval/signature"]',
    '["Hunter is responsible for licenses, tags, hunter education, and legal method of take", "Landowner confirms authority to grant access and any required Texas hunting lease license", "Exact property boundaries are confidential until approval and signature"]',
    array[
      'https://tpwd.texas.gov/business/licenses/public/commercial/hunting/',
      'https://tpwd.texas.gov/education/hunter-education',
      'https://tpwd.texas.gov/regulations/outdoor-annual/licenses/hunting-licenses-and-permits'
    ]
  ),
  (
    'CO',
    'Colorado',
    'Colorado Parks and Wildlife',
    'https://cpw.state.co.us/',
    'Hunters must hold the applicable Colorado license, qualifying license where required, habitat stamp where applicable, and any species/unit authorization.',
    'Colorado requires anyone born on or after January 1, 1949 to complete approved hunter education before applying for or buying a Colorado hunting license.',
    'Private land access requires landowner permission; trespass and access rules must be confirmed before entry.',
    'No statewide marketplace hunting lease license requirement was identified in CPW public guidance; listing terms should still be reviewed for local/state compliance.',
    'Blaze orange or pink requirements vary by season/species; hunters must verify current CPW regulations.',
    '["Landowner confirms private land access authority", "Landowner provides GMU/unit context where relevant", "Landowner defines allowed species, methods, dates, and access routes"]',
    '["I will hold all required Colorado licenses, habitat stamp, and draw/unit authorizations before hunting", "I understand Colorado hunter education applies if I was born on or after January 1, 1949", "I will not enter private land without approval and signed terms"]',
    '["Verify license/draw/unit authorization", "Verify hunter education where required", "Confirm GMU/unit and season dates", "Sign lease agreement electronically"]',
    '["Hunter is responsible for CPW licenses, habitat stamp, draw/unit compliance, and hunter education", "Access is limited to approved dates, species, party size, and mapped areas"]',
    array[
      'https://cpw.state.co.us/activities/hunting',
      'https://cpw.state.co.us/activities/hunting/big-game'
    ]
  ),
  (
    'MT',
    'Montana',
    'Montana Fish, Wildlife & Parks',
    'https://fwp.mt.gov/',
    'Hunters must hold the required Montana license, tags, permits, and district-specific authorizations before hunting.',
    'Montana hunter education and apprentice/mentor rules vary by age and license path; hunters must verify current FWP requirements.',
    'Montana FWP states hunters must obtain landowner permission to hunt on all private land.',
    'No statewide marketplace hunting lease license requirement was identified in FWP public guidance; landowner access terms and local rules still apply.',
    'Hunter orange requirements depend on season/species; hunters must verify current Montana regulations.',
    '["Landowner confirms private land permission terms", "Landowner provides hunting district context where relevant", "Landowner defines access routes, gates, parking, livestock, and closed areas"]',
    '["I will hold the required Montana license, tags, permits, and district authorizations before hunting", "I understand landowner permission is required for all Montana private land hunting", "I will follow gates, livestock, road, parking, and access-route rules"]',
    '["Verify license/tags/district authorization", "Confirm landowner permission", "Confirm access routes and closed areas", "Sign lease agreement electronically"]',
    '["Hunter is responsible for FWP license, tag, permit, district, and season compliance", "Landowner permission is limited to the signed agreement and mapped access area"]',
    array[
      'https://fwp.mt.gov/hunt/access/private-lands',
      'https://fwp.mt.gov/hunt/regulations'
    ]
  ),
  (
    'GA',
    'Georgia',
    'Georgia Wildlife Resources Division',
    'https://georgiawildlife.com/',
    'Hunters must hold required Georgia resident or non-resident hunting licenses and species-specific permits/tags unless a legal exemption applies.',
    'Georgia requires residents and non-residents born on or after January 1, 1961 to complete hunter education before purchasing a season hunting license, with listed exceptions.',
    'Georgia recognizes private land access through permission, formal lease contracts, or hunting clubs; written terms should define access, guests, dates, and species.',
    'No statewide marketplace hunting lease license requirement was identified in Georgia WRD public guidance; lease terms and liability notices should be reviewed locally.',
    'Hunter orange requirements vary by species and season; hunters must verify current Georgia regulations.',
    '["Landowner confirms access authority", "Landowner defines club/lease style terms if applicable", "Landowner provides allowed species, guest policy, and harvest reporting expectations"]',
    '["I will hold required Georgia licenses and permits before hunting", "I understand Georgia hunter education applies to hunters born on or after January 1, 1961 unless an exception applies", "I will follow private land permission and lease terms"]',
    '["Verify license/permit status", "Verify hunter education or exception", "Confirm private land lease terms", "Sign lease agreement electronically"]',
    '["Hunter is responsible for Georgia license, permit, season, harvest reporting, and hunter education compliance", "Private land access is granted only under the signed terms"]',
    array[
      'https://georgiawildlife.com/hunting/huntereducation',
      'https://georgiawildlife.com/hunting-permissions',
      'https://georgiawildlife.com/licenses-permits-passes/choose'
    ]
  )
on conflict (state_code) do update
set
  state_name = excluded.state_name,
  agency_name = excluded.agency_name,
  agency_url = excluded.agency_url,
  license_summary = excluded.license_summary,
  hunter_education_summary = excluded.hunter_education_summary,
  private_land_permission_summary = excluded.private_land_permission_summary,
  lease_license_summary = excluded.lease_license_summary,
  hunter_orange_summary = excluded.hunter_orange_summary,
  landowner_listing_requirements = excluded.landowner_listing_requirements,
  hunter_attestations = excluded.hunter_attestations,
  booking_checklist = excluded.booking_checklist,
  contract_clauses = excluded.contract_clauses,
  source_urls = excluded.source_urls,
  active = true,
  reviewed_at = now();
