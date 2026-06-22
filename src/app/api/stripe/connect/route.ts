import { NextResponse } from "next/server";
import { appUrl } from "@/lib/email/templates";
import { env } from "@/lib/env";
import { createStripeClient } from "@/lib/payments/stripe-client";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";

function stripeClient() {
  if (!env.stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is required for Stripe Connect.");
  }

  return createStripeClient();
}

async function createConnectRedirect(request: Request) {
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

  const { data: profile } = await service
    .from("profiles")
    .select("role, full_name, first_name, last_name, phone, country_code")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "landowner") {
    return NextResponse.redirect(
      new URL("/dashboard?view=profile&connect=landowner_required", request.url),
      { status: 303 },
    );
  }

  const { data: existing } = await service
    .from("payment_accounts")
    .select("provider_account_id")
    .eq("user_id", user.id)
    .eq("provider", "stripe")
    .maybeSingle();

  if (!env.stripeSecretKey) {
    return NextResponse.redirect(
      new URL("/dashboard?view=profile&connect=missing_stripe", request.url),
      { status: 303 },
    );
  }

  const stripe = stripeClient();
  const displayName =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    profile.full_name ||
    "Huntfields landowner";
  const country = profile.country_code || "US";

  const account =
    existing?.provider_account_id
      ? await stripe.v2.core.accounts.retrieve(existing.provider_account_id, {
          include: ["configuration.recipient", "requirements"],
        })
      : await stripe.v2.core.accounts.create({
          contact_email: user.email ?? undefined,
          contact_phone: profile.phone ?? undefined,
          dashboard: "express",
          display_name: displayName,
          defaults: {
            currency: "usd",
            locales: ["en-US"],
            profile: {
              doing_business_as: displayName,
              product_description:
                "Private hunting lease marketplace payouts for landowners.",
            },
            responsibilities: {
              fees_collector: "application",
              losses_collector: "application",
            },
          },
          identity: {
            country,
          },
          configuration: {
            recipient: {
              capabilities: {
                stripe_balance: {
                  stripe_transfers: {
                    requested: true,
                  },
                },
              },
            },
          },
          include: ["configuration.recipient", "requirements"],
          metadata: {
            huntfields_user_id: user.id,
            huntfields_role: "landowner",
          },
        });

  await service.from("payment_accounts").upsert(
    {
      user_id: user.id,
      provider: "stripe",
      provider_account_id: account.id,
      onboarding_status: "pending",
      charges_enabled: false,
      payouts_enabled: false,
      default_currency: "USD",
      metadata: {
        stripe_object: account.object,
        dashboard: account.dashboard ?? "express",
        applied_configurations: account.applied_configurations ?? [],
      },
    },
    { onConflict: "user_id,provider" },
  );

  const accountLink = await stripe.v2.core.accountLinks.create({
    account: account.id,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        configurations: ["recipient"],
        collection_options: {
          fields: "eventually_due",
          future_requirements: "include",
        },
        refresh_url: appUrl("/api/stripe/connect"),
        return_url: appUrl("/api/stripe/connect/return"),
      },
    },
  });

  return NextResponse.redirect(accountLink.url, { status: 303 });
}

export async function GET(request: Request) {
  return createConnectRedirect(request);
}

export async function POST(request: Request) {
  return createConnectRedirect(request);
}
