-- Marketplace terms, fee, payment, and chat-document workflow.
-- This layer keeps the MVP Stripe-ready while allowing manual/no-key operation.

alter table public.listing_requests
  add column if not exists workflow_stage text not null default 'message_open',
  add column if not exists terms_proposed_at timestamptz,
  add column if not exists contract_sent_at timestamptz,
  add column if not exists payment_due_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'listing_requests_workflow_stage_check'
  ) then
    alter table public.listing_requests
      add constraint listing_requests_workflow_stage_check
      check (
        workflow_stage in (
          'message_open',
          'terms_proposed',
          'contract_sent',
          'partially_signed',
          'payment_due',
          'active',
          'declined',
          'cancelled'
        )
      );
  end if;
end $$;

alter table public.bookings
  add column if not exists workflow_stage text not null default 'signature_pending',
  add column if not exists payment_status text not null default 'not_started',
  add column if not exists lease_amount_cents integer,
  add column if not exists additional_fee_cents integer not null default 0,
  add column if not exists hunter_platform_fee_cents integer not null default 0,
  add column if not exists landowner_platform_fee_cents integer not null default 0,
  add column if not exists landowner_payout_cents integer,
  add column if not exists total_charge_cents integer,
  add column if not exists renewal_type text not null default 'none',
  add column if not exists renewal_notice_days integer,
  add column if not exists payment_due_at timestamptz,
  add column if not exists stripe_connected_account_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bookings_marketplace_amounts_positive'
  ) then
    alter table public.bookings
      add constraint bookings_marketplace_amounts_positive
      check (
        coalesce(lease_amount_cents, 0) >= 0
        and additional_fee_cents >= 0
        and hunter_platform_fee_cents >= 0
        and landowner_platform_fee_cents >= 0
        and coalesce(landowner_payout_cents, 0) >= 0
        and coalesce(total_charge_cents, 0) >= 0
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'bookings_workflow_stage_check'
  ) then
    alter table public.bookings
      add constraint bookings_workflow_stage_check
      check (
        workflow_stage in (
          'signature_pending',
          'partially_signed',
          'payment_due',
          'payment_processing',
          'active',
          'completed',
          'cancelled',
          'refunded'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'bookings_payment_status_check'
  ) then
    alter table public.bookings
      add constraint bookings_payment_status_check
      check (
        payment_status in (
          'not_started',
          'payment_due',
          'checkout_created',
          'processing',
          'paid',
          'failed',
          'refunded',
          'manual_pending'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'bookings_renewal_type_check'
  ) then
    alter table public.bookings
      add constraint bookings_renewal_type_check
      check (renewal_type in ('none', 'annual_optional', 'annual_auto'));
  end if;
end $$;

create table if not exists public.platform_fee_configs (
  id uuid primary key default gen_random_uuid(),
  market_code text not null unique,
  owner_initial_bps integer not null default 1000,
  hunter_initial_bps integer not null default 500,
  owner_renewal_bps integer not null default 500,
  hunter_renewal_bps integer not null default 250,
  active boolean not null default true,
  effective_from timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_fee_bps_valid check (
    owner_initial_bps between 0 and 10000
    and hunter_initial_bps between 0 and 10000
    and owner_renewal_bps between 0 and 10000
    and hunter_renewal_bps between 0 and 10000
  )
);

drop trigger if exists platform_fee_configs_set_updated_at on public.platform_fee_configs;
create trigger platform_fee_configs_set_updated_at
before update on public.platform_fee_configs
for each row execute function public.set_updated_at();

insert into public.platform_fee_configs (
  market_code,
  owner_initial_bps,
  hunter_initial_bps,
  owner_renewal_bps,
  hunter_renewal_bps
)
values ('US', 1000, 500, 500, 250)
on conflict (market_code) do update
set owner_initial_bps = excluded.owner_initial_bps,
    hunter_initial_bps = excluded.hunter_initial_bps,
    owner_renewal_bps = excluded.owner_renewal_bps,
    hunter_renewal_bps = excluded.hunter_renewal_bps,
    active = true;

create or replace function public.calculate_huntfields_fees(
  p_lease_amount_cents integer,
  p_additional_fee_cents integer default 0,
  p_market_code text default 'US',
  p_is_renewal boolean default false
)
returns table (
  lease_amount_cents integer,
  additional_fee_cents integer,
  owner_platform_fee_cents integer,
  hunter_platform_fee_cents integer,
  landowner_payout_cents integer,
  hunter_total_cents integer,
  owner_fee_bps integer,
  hunter_fee_bps integer
)
language sql
stable
security definer
set search_path = public
as $$
  with cfg as (
    select *
    from public.platform_fee_configs
    where active
      and market_code = coalesce(nullif(upper(p_market_code), ''), 'US')
    order by effective_from desc
    limit 1
  ),
  base as (
    select
      greatest(coalesce(p_lease_amount_cents, 0), 0)::integer as lease_amount,
      greatest(coalesce(p_additional_fee_cents, 0), 0)::integer as extra_amount,
      case when p_is_renewal then cfg.owner_renewal_bps else cfg.owner_initial_bps end as owner_bps,
      case when p_is_renewal then cfg.hunter_renewal_bps else cfg.hunter_initial_bps end as hunter_bps
    from cfg
  ),
  fees as (
    select
      lease_amount,
      extra_amount,
      owner_bps,
      hunter_bps,
      round(((lease_amount + extra_amount)::numeric * owner_bps::numeric) / 10000.0)::integer as owner_fee,
      round(((lease_amount + extra_amount)::numeric * hunter_bps::numeric) / 10000.0)::integer as hunter_fee
    from base
  )
  select
    lease_amount,
    extra_amount,
    owner_fee,
    hunter_fee,
    greatest(lease_amount + extra_amount - owner_fee, 0)::integer,
    greatest(lease_amount + extra_amount + hunter_fee, 0)::integer,
    owner_bps,
    hunter_bps
  from fees;
$$;

create table if not exists public.lease_terms_proposals (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.listing_requests(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  booking_id uuid unique references public.bookings(id) on delete set null,
  hunter_id uuid not null references public.profiles(id) on delete cascade,
  landowner_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'contract_generated',
  lease_amount_cents integer not null,
  additional_fee_cents integer not null default 0,
  owner_platform_fee_cents integer not null default 0,
  hunter_platform_fee_cents integer not null default 0,
  landowner_payout_cents integer not null,
  hunter_total_cents integer not null,
  currency char(3) not null default 'USD',
  starts_on date not null,
  ends_on date not null,
  party_size integer not null default 1,
  renewal_type text not null default 'none',
  renewal_notice_days integer,
  payment_schedule text not null default 'due_after_signature',
  contract_source text not null default 'generated',
  uploaded_contract_path text,
  ai_contract_requested boolean not null default true,
  terms_notes text,
  proposed_by uuid references public.profiles(id) on delete set null,
  proposed_at timestamptz not null default now(),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lease_terms_amounts_positive check (
    lease_amount_cents >= 0
    and additional_fee_cents >= 0
    and owner_platform_fee_cents >= 0
    and hunter_platform_fee_cents >= 0
    and landowner_payout_cents >= 0
    and hunter_total_cents >= 0
    and party_size > 0
    and ends_on >= starts_on
  ),
  constraint lease_terms_status_check check (
    status in ('proposed', 'accepted', 'contract_generated', 'voided')
  ),
  constraint lease_terms_renewal_type_check check (
    renewal_type in ('none', 'annual_optional', 'annual_auto')
  ),
  constraint lease_terms_payment_schedule_check check (
    payment_schedule in ('due_after_signature', 'manual_invoice', 'offline')
  ),
  constraint lease_terms_contract_source_check check (
    contract_source in ('generated', 'uploaded_pdf')
  )
);

drop trigger if exists lease_terms_proposals_set_updated_at on public.lease_terms_proposals;
create trigger lease_terms_proposals_set_updated_at
before update on public.lease_terms_proposals
for each row execute function public.set_updated_at();

alter table public.booking_contracts
  add column if not exists terms_proposal_id uuid references public.lease_terms_proposals(id) on delete set null,
  add column if not exists contract_source text not null default 'generated',
  add column if not exists uploaded_contract_path text,
  add column if not exists lease_amount_cents integer,
  add column if not exists additional_fee_cents integer not null default 0,
  add column if not exists hunter_platform_fee_cents integer not null default 0,
  add column if not exists landowner_platform_fee_cents integer not null default 0,
  add column if not exists landowner_payout_cents integer,
  add column if not exists hunter_total_cents integer,
  add column if not exists renewal_type text not null default 'none',
  add column if not exists payment_due_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'booking_contracts_contract_source_check'
  ) then
    alter table public.booking_contracts
      add constraint booking_contracts_contract_source_check
      check (contract_source in ('generated', 'uploaded_pdf'));
  end if;
end $$;

create table if not exists public.payment_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider public.payment_provider not null default 'stripe',
  provider_account_id text not null,
  onboarding_status text not null default 'pending',
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  default_currency char(3) not null default 'USD',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_account_id),
  unique (user_id, provider),
  constraint payment_accounts_status_check check (
    onboarding_status in ('pending', 'restricted', 'enabled', 'disabled')
  )
);

drop trigger if exists payment_accounts_set_updated_at on public.payment_accounts;
create trigger payment_accounts_set_updated_at
before update on public.payment_accounts
for each row execute function public.set_updated_at();

create table if not exists public.booking_payment_intents (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  hunter_id uuid not null references public.profiles(id) on delete cascade,
  landowner_id uuid not null references public.profiles(id) on delete cascade,
  provider public.payment_provider not null default 'manual',
  status text not null default 'created',
  amount_cents integer not null,
  currency char(3) not null default 'USD',
  owner_platform_fee_cents integer not null default 0,
  hunter_platform_fee_cents integer not null default 0,
  application_fee_cents integer not null default 0,
  landowner_payout_cents integer not null default 0,
  provider_checkout_id text,
  provider_payment_id text,
  checkout_url text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_payment_intents_amounts_positive check (
    amount_cents >= 0
    and owner_platform_fee_cents >= 0
    and hunter_platform_fee_cents >= 0
    and application_fee_cents >= 0
    and landowner_payout_cents >= 0
  ),
  constraint booking_payment_intents_status_check check (
    status in ('created', 'checkout_created', 'manual_pending', 'paid', 'failed', 'cancelled', 'refunded')
  )
);

drop trigger if exists booking_payment_intents_set_updated_at on public.booking_payment_intents;
create trigger booking_payment_intents_set_updated_at
before update on public.booking_payment_intents
for each row execute function public.set_updated_at();

create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  request_id uuid references public.listing_requests(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id) on delete cascade,
  storage_bucket text not null default 'message-attachments',
  storage_path text not null,
  file_name text not null,
  content_type text not null,
  file_size integer not null default 0,
  attachment_kind text not null default 'document',
  created_at timestamptz not null default now(),
  constraint message_attachments_kind_check check (
    attachment_kind in ('document', 'photo', 'contract', 'insurance', 'ownership')
  )
);

create index if not exists listing_requests_workflow_idx
  on public.listing_requests (workflow_stage, created_at desc);
create index if not exists bookings_workflow_idx
  on public.bookings (workflow_stage, payment_status, created_at desc);
create index if not exists lease_terms_request_idx
  on public.lease_terms_proposals (request_id, status);
create index if not exists lease_terms_parties_idx
  on public.lease_terms_proposals (hunter_id, landowner_id, status);
create index if not exists payment_accounts_user_idx
  on public.payment_accounts (user_id, provider, onboarding_status);
create index if not exists booking_payment_intents_booking_idx
  on public.booking_payment_intents (booking_id, status, created_at desc);
create index if not exists message_attachments_message_idx
  on public.message_attachments (message_id, created_at);

alter table public.platform_fee_configs enable row level security;
alter table public.lease_terms_proposals enable row level security;
alter table public.payment_accounts enable row level security;
alter table public.booking_payment_intents enable row level security;
alter table public.message_attachments enable row level security;

drop policy if exists "Active fee configs readable" on public.platform_fee_configs;
create policy "Active fee configs readable"
on public.platform_fee_configs for select
to anon, authenticated
using (active);

drop policy if exists "Lease terms visible to parties" on public.lease_terms_proposals;
create policy "Lease terms visible to parties"
on public.lease_terms_proposals for select
to authenticated
using (hunter_id = auth.uid() or landowner_id = auth.uid() or public.is_admin());

drop policy if exists "Landowners manage lease terms" on public.lease_terms_proposals;
create policy "Landowners manage lease terms"
on public.lease_terms_proposals for all
to authenticated
using (landowner_id = auth.uid() or public.is_admin())
with check (landowner_id = auth.uid() or public.is_admin());

drop policy if exists "Users manage own payment accounts" on public.payment_accounts;
create policy "Users manage own payment accounts"
on public.payment_accounts for all
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Booking payment intents visible to parties" on public.booking_payment_intents;
create policy "Booking payment intents visible to parties"
on public.booking_payment_intents for select
to authenticated
using (hunter_id = auth.uid() or landowner_id = auth.uid() or public.is_admin());

drop policy if exists "Message attachment parties can read" on public.message_attachments;
create policy "Message attachment parties can read"
on public.message_attachments for select
to authenticated
using (
  uploader_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.messages m
    where m.id = message_id
      and (m.sender_id = auth.uid() or m.recipient_id = auth.uid())
  )
);

drop policy if exists "Message attachment parties can insert" on public.message_attachments;
create policy "Message attachment parties can insert"
on public.message_attachments for insert
to authenticated
with check (
  uploader_id = auth.uid()
  and exists (
    select 1 from public.messages m
    where m.id = message_id
      and m.sender_id = auth.uid()
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('contract-documents', 'contract-documents', false, 20971520, array['application/pdf']),
  ('message-attachments', 'message-attachments', false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Message attachments readable by authenticated users" on storage.objects;
drop policy if exists "Message attachment uploaders read own storage objects" on storage.objects;
create policy "Message attachment uploaders read own storage objects"
on storage.objects for select
to authenticated
using (
  bucket_id = 'message-attachments'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

drop policy if exists "Users upload own contract documents" on storage.objects;
create policy "Users upload own contract documents"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'contract-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users read own contract documents" on storage.objects;
create policy "Users read own contract documents"
on storage.objects for select
to authenticated
using (
  bucket_id = 'contract-documents'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

create or replace function public.refresh_contract_status(p_contract_id uuid)
returns public.contract_status
language plpgsql
security definer
set search_path = public
as $$
declare
  signature_count integer;
  next_status public.contract_status;
  v_booking_id uuid;
  v_request_id uuid;
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
      signed_at = case when next_status = 'signed' then coalesce(signed_at, now()) else signed_at end,
      payment_due_at = case when next_status = 'signed' then coalesce(payment_due_at, now() + interval '48 hours') else payment_due_at end
  where id = p_contract_id
  returning booking_id, request_id into v_booking_id, v_request_id;

  if next_status = 'partially_signed' then
    update public.bookings
    set workflow_stage = 'partially_signed'
    where id = v_booking_id;

    update public.listing_requests
    set workflow_stage = 'partially_signed'
    where id = v_request_id;
  elsif next_status = 'signed' then
    update public.bookings
    set status = 'pending_payment',
        workflow_stage = 'payment_due',
        payment_status = 'payment_due',
        payment_due_at = coalesce(payment_due_at, now() + interval '48 hours')
    where id = v_booking_id;

    update public.listing_requests
    set workflow_stage = 'payment_due',
        payment_due_at = coalesce(payment_due_at, now() + interval '48 hours')
    where id = v_request_id;
  end if;

  return next_status;
end;
$$;

create or replace function public.mark_booking_paid(
  p_booking_id uuid,
  p_provider_checkout_id text default null,
  p_provider_payment_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid;
begin
  update public.bookings
  set status = 'confirmed',
      workflow_stage = 'active',
      payment_status = 'paid',
      provider_checkout_id = coalesce(p_provider_checkout_id, provider_checkout_id),
      provider_payment_id = coalesce(p_provider_payment_id, provider_payment_id),
      confirmed_at = coalesce(confirmed_at, now())
  where id = p_booking_id
  returning request_id into v_request_id;

  update public.listing_requests
  set workflow_stage = 'active'
  where id = v_request_id;

  update public.booking_payment_intents
  set status = 'paid',
      provider_checkout_id = coalesce(p_provider_checkout_id, provider_checkout_id),
      provider_payment_id = coalesce(p_provider_payment_id, provider_payment_id)
  where booking_id = p_booking_id
    and status in ('created', 'checkout_created', 'manual_pending');
end;
$$;

grant select on public.platform_fee_configs to anon, authenticated;
grant select, insert, update on public.lease_terms_proposals to authenticated;
grant select, insert, update on public.payment_accounts to authenticated;
grant select on public.booking_payment_intents to authenticated;
grant select, insert on public.message_attachments to authenticated;
grant all on public.platform_fee_configs to service_role;
grant all on public.lease_terms_proposals to service_role;
grant all on public.payment_accounts to service_role;
grant all on public.booking_payment_intents to service_role;
grant all on public.message_attachments to service_role;
grant execute on function public.calculate_huntfields_fees(integer, integer, text, boolean) to anon, authenticated, service_role;
grant execute on function public.refresh_contract_status(uuid) to authenticated, service_role;
grant execute on function public.mark_booking_paid(uuid, text, text) to service_role;
