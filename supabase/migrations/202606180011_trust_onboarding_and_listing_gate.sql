-- Trust/onboarding foundation. Users can self-select hunter or landowner during
-- onboarding; high-trust actions still use separate verification records.

do $$ begin
  create type public.verification_status as enum ('not_started', 'pending', 'verified', 'rejected', 'expired');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.verification_provider as enum ('manual', 'gis_api', 'stripe_identity', 'checkr');
exception when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists street_address text,
  add column if not exists address_line2 text,
  add column if not exists city text,
  add column if not exists admin_area_code text,
  add column if not exists postal_code text,
  add column if not exists role_selected_at timestamptz;

create table if not exists public.property_verifications (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  status public.verification_status not null default 'not_started',
  provider public.verification_provider not null default 'manual',
  document_path text,
  provider_reference text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  rejection_reason text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint property_verifications_listing_or_owner_doc check (
    listing_id is not null or document_path is not null or provider_reference is not null
  )
);

create trigger property_verifications_set_updated_at
before update on public.property_verifications
for each row execute function public.set_updated_at();

create table if not exists public.hunter_insurance_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.verification_status not null default 'pending',
  provider_name text,
  policy_number text not null,
  policy_expires_on date,
  document_path text not null,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger hunter_insurance_documents_set_updated_at
before update on public.hunter_insurance_documents
for each row execute function public.set_updated_at();

create table if not exists public.identity_verification_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider public.verification_provider not null,
  check_type text not null,
  status public.verification_status not null default 'not_started',
  provider_session_id text,
  provider_url text,
  result_summary text,
  consent_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger identity_verification_checks_set_updated_at
before update on public.identity_verification_checks
for each row execute function public.set_updated_at();

create index if not exists property_verifications_owner_idx
  on public.property_verifications (owner_id, status, created_at desc);
create index if not exists property_verifications_listing_idx
  on public.property_verifications (listing_id, status);
create index if not exists hunter_insurance_user_idx
  on public.hunter_insurance_documents (user_id, status, submitted_at desc);
create index if not exists identity_verification_user_idx
  on public.identity_verification_checks (user_id, provider, status, created_at desc);

alter table public.property_verifications enable row level security;
alter table public.hunter_insurance_documents enable row level security;
alter table public.identity_verification_checks enable row level security;

drop policy if exists "Owners manage own property verifications" on public.property_verifications;
create policy "Owners manage own property verifications"
on public.property_verifications for all
to authenticated
using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists "Hunters manage own insurance documents" on public.hunter_insurance_documents;
create policy "Hunters manage own insurance documents"
on public.hunter_insurance_documents for all
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users manage own identity checks" on public.identity_verification_checks;
create policy "Users manage own identity checks"
on public.identity_verification_checks for all
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('verification-documents', 'verification-documents', false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('insurance-documents', 'insurance-documents', false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users upload own verification documents" on storage.objects;
create policy "Users upload own verification documents"
on storage.objects for insert
to authenticated
with check (
  bucket_id in ('verification-documents', 'insurance-documents')
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users read own verification documents" on storage.objects;
create policy "Users read own verification documents"
on storage.objects for select
to authenticated
using (
  bucket_id in ('verification-documents', 'insurance-documents')
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

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

grant update (
  first_name,
  last_name,
  full_name,
  phone,
  country_code,
  street_address,
  address_line2,
  city,
  admin_area_code,
  postal_code,
  onboarding_completed,
  marketing_consent,
  role_selected_at
) on public.profiles to authenticated;

grant insert (
  id,
  first_name,
  last_name,
  full_name,
  phone,
  country_code,
  street_address,
  address_line2,
  city,
  admin_area_code,
  postal_code,
  onboarding_completed,
  marketing_consent,
  role_selected_at
) on public.profiles to authenticated;

grant select, insert, update on public.property_verifications to authenticated;
grant select, insert, update on public.hunter_insurance_documents to authenticated;
grant select, insert, update on public.identity_verification_checks to authenticated;
grant all on public.property_verifications to service_role;
grant all on public.hunter_insurance_documents to service_role;
grant all on public.identity_verification_checks to service_role;
