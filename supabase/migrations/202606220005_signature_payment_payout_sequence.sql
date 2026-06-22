-- Final launch sequence:
-- 1. Landowner proposes terms and contract is sent to the hunter.
-- 2. Hunter signs first.
-- 3. Hunter pays through Checkout.
-- 4. Landowner signs after payment.
-- 5. Contract becomes active and owner payout transfer can be created.

alter table public.booking_payment_intents
  add column if not exists provider_charge_id text,
  add column if not exists provider_transfer_id text,
  add column if not exists transfer_status text not null default 'not_started',
  add column if not exists transfer_error text;

alter table public.bookings
  add column if not exists provider_charge_id text,
  add column if not exists owner_transfer_id text,
  add column if not exists owner_transfer_status text not null default 'not_started';

create index if not exists booking_payment_intents_transfer_idx
  on public.booking_payment_intents (booking_id, transfer_status, created_at desc);

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
  v_payment_status text;
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
      payment_due_at = case when next_status = 'partially_signed' then coalesce(payment_due_at, now() + interval '48 hours') else payment_due_at end
  where id = p_contract_id
  returning booking_id, request_id into v_booking_id, v_request_id;

  select payment_status into v_payment_status
  from public.bookings
  where id = v_booking_id;

  if next_status = 'partially_signed' then
    update public.bookings
    set workflow_stage = 'payment_due',
        payment_status = case when payment_status = 'paid' then payment_status else 'payment_due' end,
        payment_due_at = coalesce(payment_due_at, now() + interval '48 hours')
    where id = v_booking_id;

    update public.listing_requests
    set workflow_stage = 'payment_due',
        payment_due_at = coalesce(payment_due_at, now() + interval '48 hours')
    where id = v_request_id;
  elsif next_status = 'signed' then
    update public.bookings
    set status = case when v_payment_status = 'paid' then 'confirmed'::public.booking_status else 'pending_payment'::public.booking_status end,
        workflow_stage = case when v_payment_status = 'paid' then 'active' else 'payment_due' end,
        confirmed_at = case when v_payment_status = 'paid' then coalesce(confirmed_at, now()) else confirmed_at end
    where id = v_booking_id;

    update public.listing_requests
    set workflow_stage = case when v_payment_status = 'paid' then 'active' else 'payment_due' end
    where id = v_request_id;
  end if;

  return next_status;
end;
$$;

drop function if exists public.mark_booking_paid(uuid, text, text);

create or replace function public.mark_booking_paid(
  p_booking_id uuid,
  p_provider_checkout_id text default null,
  p_provider_payment_id text default null,
  p_provider_charge_id text default null
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
      provider_charge_id = coalesce(p_provider_charge_id, provider_charge_id)
  where booking_id = p_booking_id
    and status in ('created', 'checkout_created', 'manual_pending');
end;
$$;

grant execute on function public.refresh_contract_status(uuid) to authenticated, service_role;
grant execute on function public.mark_booking_paid(uuid, text, text, text) to service_role;
