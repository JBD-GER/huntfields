import { NextResponse } from "next/server";
import { appUrl } from "@/lib/email/templates";
import { env } from "@/lib/env";
import { createStripeClient } from "@/lib/payments/stripe-client";
import { ensureStripeCustomer } from "@/lib/payments/stripe-customer";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const service = createSupabaseServiceClient();

  if (!supabase || !service) {
    return NextResponse.redirect(
      new URL("/dashboard?view=profile&billing=missing_supabase", request.url),
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

  if (!env.stripeSecretKey) {
    return NextResponse.redirect(
      new URL("/dashboard?view=profile&billing=missing_stripe", request.url),
      { status: 303 },
    );
  }

  const { data: profile } = await service
    .from("profiles")
    .select("full_name, first_name, last_name, phone")
    .eq("id", user.id)
    .maybeSingle();
  const name =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    profile?.full_name ||
    null;

  try {
    const stripe = createStripeClient();
    const customerId = await ensureStripeCustomer({
      supabase: service,
      userId: user.id,
      email: user.email,
      name,
      phone: profile?.phone,
      stripe,
      metadata: {
        huntfields_portal: "true",
      },
    });
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: appUrl("/dashboard?view=profile&billing=returned"),
    });

    return NextResponse.redirect(session.url, { status: 303 });
  } catch (error) {
    const url = new URL("/dashboard?view=profile&billing=portal_failed", request.url);
    if (error instanceof Error) {
      url.searchParams.set("billing_error", error.message);
    }

    return NextResponse.redirect(url, { status: 303 });
  }
}
