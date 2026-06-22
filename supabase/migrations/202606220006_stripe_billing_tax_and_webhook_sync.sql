-- Stripe go-live hardening:
-- - Keep a stable Stripe Customer per Huntfields user for billing portal access.
-- - Store invoice, tax, receipt, and payment-method metadata from Checkout/webhooks.
-- - Deduplicate Stripe webhook events before side effects.

create table if not exists public.stripe_customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'stripe',
  provider_customer_id text not null,
  email text,
  default_currency char(3) not null default 'USD',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stripe_customers_provider_check check (provider = 'stripe'),
  constraint stripe_customers_user_provider_unique unique (user_id, provider),
  constraint stripe_customers_provider_customer_unique unique (provider, provider_customer_id)
);

drop trigger if exists stripe_customers_set_updated_at on public.stripe_customers;
create trigger stripe_customers_set_updated_at
before update on public.stripe_customers
for each row execute function public.set_updated_at();

alter table public.booking_payment_intents
  add column if not exists provider_customer_id text,
  add column if not exists provider_invoice_id text,
  add column if not exists provider_invoice_url text,
  add column if not exists provider_invoice_pdf text,
  add column if not exists tax_amount_cents integer not null default 0,
  add column if not exists tax_status text,
  add column if not exists payment_method_type text,
  add column if not exists payment_method_summary text,
  add column if not exists receipt_url text;

alter table public.bookings
  add column if not exists provider_customer_id text,
  add column if not exists provider_invoice_id text,
  add column if not exists provider_invoice_url text,
  add column if not exists provider_invoice_pdf text,
  add column if not exists tax_amount_cents integer not null default 0,
  add column if not exists receipt_url text;

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now()
);

create index if not exists stripe_customers_user_idx
  on public.stripe_customers (user_id, provider);

create index if not exists booking_payment_intents_customer_idx
  on public.booking_payment_intents (provider_customer_id, created_at desc);

create index if not exists booking_payment_intents_invoice_idx
  on public.booking_payment_intents (provider_invoice_id);

create index if not exists bookings_invoice_idx
  on public.bookings (provider_invoice_id);

alter table public.stripe_customers enable row level security;
alter table public.stripe_webhook_events enable row level security;

drop policy if exists "Users view own stripe customer" on public.stripe_customers;
create policy "Users view own stripe customer"
on public.stripe_customers for select
using (auth.uid() = user_id);

grant select on public.stripe_customers to authenticated;
grant all on public.stripe_customers to service_role;
grant all on public.stripe_webhook_events to service_role;

drop function if exists public.mark_booking_paid(uuid, text, text, text);

create or replace function public.mark_booking_paid(
  p_booking_id uuid,
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
  v_request_id uuid;
  v_contract_status public.contract_status;
begin
  select status into v_contract_status
  from public.booking_contracts
  where booking_id = p_booking_id;

  update public.bookings
  set status = case when v_contract_status = 'signed' then 'confirmed'::public.booking_status else 'pending_payment'::public.booking_status end,
      workflow_stage = case when v_contract_status = 'signed' then 'active' else 'partially_signed' end,
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
      confirmed_at = case when v_contract_status = 'signed' then coalesce(confirmed_at, now()) else confirmed_at end
  where id = p_booking_id
  returning request_id into v_request_id;

  update public.listing_requests
  set workflow_stage = case when v_contract_status = 'signed' then 'active' else 'partially_signed' end
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
  where booking_id = p_booking_id
    and status in ('created', 'checkout_created', 'manual_pending');
end;
$$;

grant execute on function public.mark_booking_paid(uuid, text, text, text, text, text, text, text, integer, text, text, text) to service_role;
