import { NextResponse } from "next/server";
import { appUrl } from "@/lib/email/templates";
import { getPaymentProvider } from "@/lib/payments/provider";
import { ensureStripeCustomer } from "@/lib/payments/stripe-customer";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;

const payableRenewalStatuses = [
  "notice_due",
  "notice_sent",
  "payment_due",
  "manual_pending",
];

export async function POST(request: Request, { params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const service = createSupabaseServiceClient();

  if (!supabase || !service) {
    return NextResponse.json(
      { error: "Supabase service role is required for renewal checkout." },
      { status: 500 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", request.url), {
      status: 303,
    });
  }

  const { data: booking, error } = await service
    .from("bookings")
    .select(
      "id, hunter_id, landowner_id, status, workflow_stage, payment_status, renewal_type, currency, listings(title)",
    )
    .eq("id", id)
    .single();

  if (error || !booking) {
    return NextResponse.json(
      { error: error?.message ?? "Booking not found." },
      { status: 404 },
    );
  }

  if (booking.hunter_id !== user.id) {
    return NextResponse.json(
      { error: "Only the hunter can pay a lease renewal." },
      { status: 403 },
    );
  }

  if (
    booking.status !== "confirmed" ||
    booking.payment_status !== "paid" ||
    booking.renewal_type === "none"
  ) {
    return NextResponse.json(
      { error: "This booking is not ready for renewal payment." },
      { status: 400 },
    );
  }

  const { data: contract } = await service
    .from("booking_contracts")
    .select("id, status")
    .eq("booking_id", booking.id)
    .maybeSingle();

  if (!contract || contract.status !== "signed") {
    return NextResponse.json(
      { error: "The original contract must be fully signed before renewal." },
      { status: 400 },
    );
  }

  const { data: renewalCycle } = await service
    .from("booking_renewal_cycles")
    .select(
      "id, status, payment_status, hunter_total_cents, hunter_platform_fee_cents, owner_platform_fee_cents, application_fee_cents, landowner_payout_cents, currency, provider_checkout_id, checkout_url",
    )
    .eq("booking_id", booking.id)
    .in("status", [
      "notice_due",
      "notice_sent",
      "payment_due",
      "checkout_created",
      "payment_processing",
      "manual_pending",
      "paid",
    ])
    .order("renewal_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!renewalCycle) {
    return NextResponse.json(
      {
        error:
          "No renewal payment is due yet. The renewal reminder job must create the renewal cycle first.",
      },
      { status: 400 },
    );
  }

  if (renewalCycle.status === "paid" || renewalCycle.payment_status === "paid") {
    return NextResponse.redirect(
      new URL(`/contracts/${contract.id}`, request.url),
      { status: 303 },
    );
  }

  if (
    renewalCycle.status === "checkout_created" &&
    renewalCycle.checkout_url
  ) {
    return NextResponse.redirect(renewalCycle.checkout_url, { status: 303 });
  }

  if (!payableRenewalStatuses.includes(renewalCycle.status)) {
    return NextResponse.json(
      { error: "This renewal payment is already processing." },
      { status: 400 },
    );
  }

  const { data: account } = await service
    .from("payment_accounts")
    .select("provider_account_id, charges_enabled, payouts_enabled, onboarding_status")
    .eq("user_id", booking.landowner_id)
    .eq("provider", "stripe")
    .maybeSingle();

  const provider = getPaymentProvider();
  const amountCents = renewalCycle.hunter_total_cents ?? 0;
  const applicationFeeCents = renewalCycle.application_fee_cents ?? 0;
  const listing = Array.isArray(booking.listings)
    ? booking.listings[0]
    : booking.listings;

  if (
    provider.name === "manual" ||
    !account?.provider_account_id ||
    !account.charges_enabled ||
    !account.payouts_enabled
  ) {
    await Promise.all([
      service.from("booking_payment_intents").insert({
        booking_id: booking.id,
        renewal_cycle_id: renewalCycle.id,
        hunter_id: booking.hunter_id,
        landowner_id: booking.landowner_id,
        provider: "manual",
        status: "manual_pending",
        amount_cents: amountCents,
        currency: renewalCycle.currency ?? booking.currency,
        owner_platform_fee_cents: renewalCycle.owner_platform_fee_cents ?? 0,
        hunter_platform_fee_cents: renewalCycle.hunter_platform_fee_cents ?? 0,
        application_fee_cents: applicationFeeCents,
        landowner_payout_cents: renewalCycle.landowner_payout_cents ?? 0,
        error_message:
          "Stripe Connect is not fully enabled for this landowner yet.",
      }),
      service
        .from("booking_renewal_cycles")
        .update({
          status: "manual_pending",
          payment_status: "manual_pending",
          provider: "manual",
        })
        .eq("id", renewalCycle.id),
    ]);

    return NextResponse.redirect(
      new URL(
        `/contracts/${contract.id}?renewal_state=connect_required`,
        request.url,
      ),
      { status: 303 },
    );
  }

  const { data: hunterProfile } = await service
    .from("profiles")
    .select("full_name, first_name, last_name, phone")
    .eq("id", user.id)
    .maybeSingle();
  const customerName =
    [hunterProfile?.first_name, hunterProfile?.last_name]
      .filter(Boolean)
      .join(" ") ||
    hunterProfile?.full_name ||
    null;
  const customerId = await ensureStripeCustomer({
    supabase: service,
    userId: user.id,
    email: user.email,
    name: customerName,
    phone: hunterProfile?.phone,
    metadata: {
      huntfields_role: "hunter",
    },
  });
  const result = await provider.createCheckout({
    bookingId: booking.id,
    renewalCycleId: renewalCycle.id,
    listingTitle: `${listing?.title ?? "Huntfields hunting lease"} renewal`,
    amountCents,
    currency: renewalCycle.currency ?? booking.currency,
    successUrl: appUrl(`/contracts/${contract.id}?renewal_state=success`),
    cancelUrl: appUrl(`/contracts/${contract.id}?renewal_state=cancelled`),
    customerId,
    customerEmail: user.email ?? undefined,
    customerName: customerName ?? undefined,
    connectedAccountId: account.provider_account_id,
    platformFeeCents: applicationFeeCents,
    transferGroup: `${booking.id}:renewal:${renewalCycle.id}`,
  });

  await Promise.all([
    service.from("booking_payment_intents").insert({
      booking_id: booking.id,
      renewal_cycle_id: renewalCycle.id,
      hunter_id: booking.hunter_id,
      landowner_id: booking.landowner_id,
      provider: result.provider,
      status: result.checkoutUrl ? "checkout_created" : "manual_pending",
      amount_cents: amountCents,
      currency: renewalCycle.currency ?? booking.currency,
      owner_platform_fee_cents: renewalCycle.owner_platform_fee_cents ?? 0,
      hunter_platform_fee_cents: renewalCycle.hunter_platform_fee_cents ?? 0,
      application_fee_cents: applicationFeeCents,
      landowner_payout_cents: renewalCycle.landowner_payout_cents ?? 0,
      provider_checkout_id: result.checkoutId,
      provider_customer_id: result.customerId ?? customerId,
      checkout_url: result.checkoutUrl,
      transfer_status: "not_started",
    }),
    service
      .from("booking_renewal_cycles")
      .update({
        status: result.checkoutUrl ? "checkout_created" : "manual_pending",
        payment_status: result.checkoutUrl
          ? "checkout_created"
          : "manual_pending",
        provider: result.provider,
        provider_checkout_id: result.checkoutId,
        provider_customer_id: result.customerId ?? customerId,
        checkout_url: result.checkoutUrl,
      })
      .eq("id", renewalCycle.id),
  ]);

  if (result.checkoutUrl) {
    return NextResponse.redirect(result.checkoutUrl, { status: 303 });
  }

  return NextResponse.redirect(
    new URL(`/contracts/${contract.id}?renewal_state=manual`, request.url),
    { status: 303 },
  );
}
