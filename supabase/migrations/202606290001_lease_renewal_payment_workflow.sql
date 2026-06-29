-- Lease renewal payment workflow.
-- Fixed-term leases stay active only through their paid date range. If renewal
-- is enabled, Huntfields creates a renewal cycle that reuses the signed
-- contract but requires a fresh hunter payment and owner payout transfer.

alter table public.bookings
  drop constraint if exists bookings_payment_status_check;

alter table public.bookings
  add constraint bookings_payment_status_check
  check (
    payment_status in (
      'not_started',
      'payment_due',
      'checkout_created',
      'processing',
      'payment_processing',
      'paid',
      'failed',
      'payment_failed',
      'refunded',
      'manual_pending'
    )
  );

create table if not exists public.booking_renewal_cycles (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  request_id uuid references public.listing_requests(id) on delete set null,
  listing_id uuid not null references public.listings(id) on delete cascade,
  original_contract_id uuid references public.booking_contracts(id) on delete set null,
  hunter_id uuid not null references public.profiles(id) on delete cascade,
  landowner_id uuid not null references public.profiles(id) on delete cascade,
  renewal_number integer not null,
  status text not null default 'notice_due',
  payment_status text not null default 'payment_due',
  previous_starts_on date not null,
  previous_ends_on date not null,
  renewal_starts_on date not null,
  renewal_ends_on date not null,
  notice_due_on date not null,
  payment_due_at timestamptz,
  lease_amount_cents integer not null,
  additional_fee_cents integer not null default 0,
  owner_platform_fee_cents integer not null default 0,
  hunter_platform_fee_cents integer not null default 0,
  application_fee_cents integer not null default 0,
  landowner_payout_cents integer not null,
  hunter_total_cents integer not null,
  currency char(3) not null default 'USD',
  provider public.payment_provider not null default 'manual',
  provider_checkout_id text,
  provider_payment_id text,
  provider_charge_id text,
  provider_customer_id text,
  provider_invoice_id text,
  provider_invoice_url text,
  provider_invoice_pdf text,
  tax_amount_cents integer not null default 0,
  tax_status text,
  receipt_url text,
  payment_method_type text,
  payment_method_summary text,
  checkout_url text,
  provider_transfer_id text,
  transfer_status text not null default 'not_started',
  transfer_error text,
  notice_sent_at timestamptz,
  paid_at timestamptz,
  expired_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id, renewal_number),
  constraint booking_renewal_cycles_status_check check (
    status in (
      'notice_due',
      'notice_sent',
      'payment_due',
      'checkout_created',
      'payment_processing',
      'paid',
      'expired',
      'cancelled',
      'manual_pending'
    )
  ),
  constraint booking_renewal_cycles_payment_status_check check (
    payment_status in (
      'payment_due',
      'checkout_created',
      'payment_processing',
      'paid',
      'payment_failed',
      'manual_pending',
      'cancelled',
      'expired'
    )
  ),
  constraint booking_renewal_cycles_transfer_status_check check (
    transfer_status in (
      'not_started',
      'created',
      'updated',
      'reversed',
      'failed',
      'manual_pending'
    )
  ),
  constraint booking_renewal_cycles_amounts_positive check (
    renewal_number > 0
    and lease_amount_cents >= 0
    and additional_fee_cents >= 0
    and owner_platform_fee_cents >= 0
    and hunter_platform_fee_cents >= 0
    and application_fee_cents >= 0
    and landowner_payout_cents >= 0
    and hunter_total_cents >= 0
    and tax_amount_cents >= 0
    and previous_ends_on >= previous_starts_on
    and renewal_ends_on >= renewal_starts_on
  )
);

drop trigger if exists booking_renewal_cycles_set_updated_at on public.booking_renewal_cycles;
create trigger booking_renewal_cycles_set_updated_at
before update on public.booking_renewal_cycles
for each row execute function public.set_updated_at();

alter table public.booking_payment_intents
  add column if not exists renewal_cycle_id uuid references public.booking_renewal_cycles(id) on delete set null;

create index if not exists booking_renewal_cycles_due_idx
  on public.booking_renewal_cycles (status, notice_due_on, payment_due_at);

create index if not exists booking_renewal_cycles_booking_idx
  on public.booking_renewal_cycles (booking_id, renewal_number desc);

create index if not exists booking_renewal_cycles_provider_checkout_idx
  on public.booking_renewal_cycles (provider_checkout_id)
  where provider_checkout_id is not null;

create index if not exists booking_payment_intents_renewal_cycle_idx
  on public.booking_payment_intents (renewal_cycle_id, status, created_at desc);

alter table public.booking_renewal_cycles enable row level security;

drop policy if exists "Renewal cycles visible to parties" on public.booking_renewal_cycles;
create policy "Renewal cycles visible to parties"
on public.booking_renewal_cycles for select
to authenticated
using (hunter_id = auth.uid() or landowner_id = auth.uid() or public.is_admin());

grant select on public.booking_renewal_cycles to authenticated;
grant all on public.booking_renewal_cycles to service_role;

create or replace function public.mark_booking_renewal_paid(
  p_renewal_cycle_id uuid,
  p_provider_checkout_id text default null,
  p_provider_payment_id text default null,
  p_provider_charge_id text default null,
  p_provider_customer_id text default null,
  p_provider_invoice_id text default null,
  p_provider_invoice_url text default null,
  p_provider_invoice_pdf text default null,
  p_tax_amount_cents integer default 0,
  p_receipt_url text default null,
  p_payment_method_type text default null,
  p_payment_method_summary text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking_id uuid;
  v_request_id uuid;
  v_renewal_starts_on date;
  v_renewal_ends_on date;
begin
  update public.booking_renewal_cycles
  set status = 'paid',
      payment_status = 'paid',
      provider_checkout_id = coalesce(p_provider_checkout_id, provider_checkout_id),
      provider_payment_id = coalesce(p_provider_payment_id, provider_payment_id),
      provider_charge_id = coalesce(p_provider_charge_id, provider_charge_id),
      provider_customer_id = coalesce(p_provider_customer_id, provider_customer_id),
      provider_invoice_id = coalesce(p_provider_invoice_id, provider_invoice_id),
      provider_invoice_url = coalesce(p_provider_invoice_url, provider_invoice_url),
      provider_invoice_pdf = coalesce(p_provider_invoice_pdf, provider_invoice_pdf),
      tax_amount_cents = coalesce(p_tax_amount_cents, tax_amount_cents, 0),
      receipt_url = coalesce(p_receipt_url, receipt_url),
      payment_method_type = coalesce(p_payment_method_type, payment_method_type),
      payment_method_summary = coalesce(p_payment_method_summary, payment_method_summary),
      paid_at = coalesce(paid_at, now()),
      expired_at = null,
      cancelled_at = null
  where id = p_renewal_cycle_id
  returning booking_id, request_id, renewal_starts_on, renewal_ends_on
  into v_booking_id, v_request_id, v_renewal_starts_on, v_renewal_ends_on;

  if v_booking_id is null then
    raise exception 'Renewal cycle % not found', p_renewal_cycle_id;
  end if;

  update public.bookings
  set status = 'confirmed'::public.booking_status,
      workflow_stage = 'active',
      payment_status = 'paid',
      starts_on = v_renewal_starts_on,
      ends_on = v_renewal_ends_on,
      provider_checkout_id = coalesce(p_provider_checkout_id, provider_checkout_id),
      provider_payment_id = coalesce(p_provider_payment_id, provider_payment_id),
      provider_charge_id = coalesce(p_provider_charge_id, provider_charge_id),
      provider_customer_id = coalesce(p_provider_customer_id, provider_customer_id),
      provider_invoice_id = coalesce(p_provider_invoice_id, provider_invoice_id),
      provider_invoice_url = coalesce(p_provider_invoice_url, provider_invoice_url),
      provider_invoice_pdf = coalesce(p_provider_invoice_pdf, provider_invoice_pdf),
      tax_amount_cents = coalesce(p_tax_amount_cents, tax_amount_cents, 0),
      receipt_url = coalesce(p_receipt_url, receipt_url),
      confirmed_at = coalesce(confirmed_at, now())
  where id = v_booking_id;

  update public.listing_requests
  set workflow_stage = 'active'
  where id = v_request_id;

  update public.booking_payment_intents
  set status = 'paid',
      provider_checkout_id = coalesce(p_provider_checkout_id, provider_checkout_id),
      provider_payment_id = coalesce(p_provider_payment_id, provider_payment_id),
      provider_charge_id = coalesce(p_provider_charge_id, provider_charge_id),
      provider_customer_id = coalesce(p_provider_customer_id, provider_customer_id),
      provider_invoice_id = coalesce(p_provider_invoice_id, provider_invoice_id),
      provider_invoice_url = coalesce(p_provider_invoice_url, provider_invoice_url),
      provider_invoice_pdf = coalesce(p_provider_invoice_pdf, provider_invoice_pdf),
      tax_amount_cents = coalesce(p_tax_amount_cents, tax_amount_cents, 0),
      receipt_url = coalesce(p_receipt_url, receipt_url),
      payment_method_type = coalesce(p_payment_method_type, payment_method_type),
      payment_method_summary = coalesce(p_payment_method_summary, payment_method_summary)
  where renewal_cycle_id = p_renewal_cycle_id
     or (
       provider_checkout_id = p_provider_checkout_id
       and p_provider_checkout_id is not null
     );
end;
$$;

grant execute on function public.mark_booking_renewal_paid(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  text,
  text,
  text
) to service_role;
