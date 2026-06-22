import { NextResponse } from "next/server";
import Stripe from "stripe";
import { env } from "@/lib/env";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";

function stripeClient() {
  if (!env.stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is required for Stripe Connect.");
  }

  return new Stripe(env.stripeSecretKey, {
    apiVersion: "2026-05-27.dahlia",
  });
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const service = createSupabaseServiceClient();

  if (!supabase || !service) {
    return NextResponse.redirect(
      new URL(
        "/dashboard?view=profile&connect=missing_supabase",
        request.url,
      ),
      { status: 303 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL("/auth/login?next=/dashboard?view=profile", request.url),
      { status: 303 },
    );
  }

  const { data: paymentAccount } = await service
    .from("payment_accounts")
    .select("provider_account_id")
    .eq("user_id", user.id)
    .eq("provider", "stripe")
    .maybeSingle();

  if (!paymentAccount?.provider_account_id) {
    return NextResponse.redirect(
      new URL("/dashboard?view=profile&connect=missing_account", request.url),
      { status: 303 },
    );
  }

  if (!env.stripeSecretKey) {
    return NextResponse.redirect(
      new URL("/dashboard?view=profile&connect=missing_stripe", request.url),
      { status: 303 },
    );
  }

  const stripe = stripeClient();
  const account = await stripe.v2.core.accounts.retrieve(
    paymentAccount.provider_account_id,
    {
      include: ["configuration.recipient", "requirements"],
    },
  );
  const stripeBalance = account.configuration?.recipient?.capabilities?.stripe_balance;
  const transfersActive =
    stripeBalance?.stripe_transfers?.status === "active";
  const payoutsActive = stripeBalance?.payouts?.status === "active";
  const restricted =
    stripeBalance?.stripe_transfers?.status === "restricted" ||
    stripeBalance?.payouts?.status === "restricted";
  const onboardingStatus =
    transfersActive && payoutsActive
      ? "enabled"
      : restricted
        ? "restricted"
        : "pending";

  await service
    .from("payment_accounts")
    .update({
      onboarding_status: onboardingStatus,
      charges_enabled: transfersActive,
      payouts_enabled: payoutsActive,
      metadata: {
        stripe_object: account.object,
        dashboard: account.dashboard ?? "express",
        applied_configurations: account.applied_configurations ?? [],
        recipient_capabilities: stripeBalance ?? null,
        requirements: account.requirements ?? null,
      },
    })
    .eq("user_id", user.id)
    .eq("provider", "stripe");

  return NextResponse.redirect(
    new URL(
      `/dashboard?view=profile&connect=${
        onboardingStatus === "enabled" ? "enabled" : "returned"
      }`,
      request.url,
    ),
    { status: 303 },
  );
}
