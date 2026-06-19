import { NextResponse } from "next/server";
import { appUrl } from "@/lib/email/templates";
import { getPaymentProvider } from "@/lib/payments/provider";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;

export async function POST(request: Request, { params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const service = createSupabaseServiceClient();

  if (!supabase || !service) {
    return NextResponse.json(
      { error: "Supabase service role is required for checkout." },
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
      "id, listing_id, hunter_id, landowner_id, status, workflow_stage, payment_status, currency, total_charge_cents, lease_amount_cents, amount_cents, hunter_platform_fee_cents, landowner_platform_fee_cents, landowner_payout_cents, provider_checkout_id, checkout_url, listings(title)",
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
      { error: "Only the hunter can start payment for this booking." },
      { status: 403 },
    );
  }

  const { data: contract } = await service
    .from("booking_contracts")
    .select("id, status")
    .eq("booking_id", booking.id)
    .maybeSingle();

  if (contract?.status !== "signed") {
    return NextResponse.json(
      { error: "Both parties must sign before payment starts." },
      { status: 400 },
    );
  }

  if (booking.payment_status === "paid" || booking.status === "confirmed") {
    return NextResponse.redirect(
      new URL(`/contracts/${contract.id}`, request.url),
      { status: 303 },
    );
  }

  const listing = Array.isArray(booking.listings)
    ? booking.listings[0]
    : booking.listings;
  const amountCents =
    booking.total_charge_cents ??
    booking.lease_amount_cents ??
    booking.amount_cents ??
    0;
  const applicationFeeCents =
    (booking.hunter_platform_fee_cents ?? 0) +
    (booking.landowner_platform_fee_cents ?? 0);

  const { data: account } = await service
    .from("payment_accounts")
    .select("provider_account_id, charges_enabled, payouts_enabled, onboarding_status")
    .eq("user_id", booking.landowner_id)
    .eq("provider", "stripe")
    .maybeSingle();

  const provider = getPaymentProvider();

  if (
    provider.name === "manual" ||
    !account?.provider_account_id ||
    !account.charges_enabled ||
    !account.payouts_enabled
  ) {
    await Promise.all([
      service.from("booking_payment_intents").insert({
        booking_id: booking.id,
        hunter_id: booking.hunter_id,
        landowner_id: booking.landowner_id,
        provider: "manual",
        status: "manual_pending",
        amount_cents: amountCents,
        currency: booking.currency,
        owner_platform_fee_cents: booking.landowner_platform_fee_cents ?? 0,
        hunter_platform_fee_cents: booking.hunter_platform_fee_cents ?? 0,
        application_fee_cents: applicationFeeCents,
        landowner_payout_cents: booking.landowner_payout_cents ?? 0,
        error_message:
          "Stripe Connect is not fully enabled for this landowner yet.",
      }),
      service
        .from("bookings")
        .update({
          payment_status: "manual_pending",
          workflow_stage: "payment_due",
        })
        .eq("id", booking.id),
    ]);

    return NextResponse.redirect(
      new URL(
        `/contracts/${contract.id}?payment_state=connect_required`,
        request.url,
      ),
      { status: 303 },
    );
  }

  const result = await provider.createCheckout({
    bookingId: booking.id,
    listingTitle: listing?.title ?? "Huntfields hunting lease",
    amountCents,
    currency: booking.currency,
    successUrl: appUrl(`/contracts/${contract.id}?payment_state=success`),
    cancelUrl: appUrl(`/contracts/${contract.id}?payment_state=cancelled`),
    customerEmail: user.email ?? undefined,
    connectedAccountId: account.provider_account_id,
    platformFeeCents: applicationFeeCents,
  });

  await Promise.all([
    service.from("booking_payment_intents").insert({
      booking_id: booking.id,
      hunter_id: booking.hunter_id,
      landowner_id: booking.landowner_id,
      provider: result.provider,
      status: result.checkoutUrl ? "checkout_created" : "manual_pending",
      amount_cents: amountCents,
      currency: booking.currency,
      owner_platform_fee_cents: booking.landowner_platform_fee_cents ?? 0,
      hunter_platform_fee_cents: booking.hunter_platform_fee_cents ?? 0,
      application_fee_cents: applicationFeeCents,
      landowner_payout_cents: booking.landowner_payout_cents ?? 0,
      provider_checkout_id: result.checkoutId,
      checkout_url: result.checkoutUrl,
    }),
    service
      .from("bookings")
      .update({
        payment_status: result.checkoutUrl
          ? "checkout_created"
          : "manual_pending",
        workflow_stage: result.checkoutUrl
          ? "payment_processing"
          : "payment_due",
        payment_provider: result.provider,
        provider_checkout_id: result.checkoutId,
        checkout_url: result.checkoutUrl,
      })
      .eq("id", booking.id),
  ]);

  if (result.checkoutUrl) {
    return NextResponse.redirect(result.checkoutUrl, { status: 303 });
  }

  return NextResponse.redirect(
    new URL(`/contracts/${contract.id}?payment_state=manual`, request.url),
    { status: 303 },
  );
}
