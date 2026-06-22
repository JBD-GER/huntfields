import { NextResponse } from "next/server";
import Stripe from "stripe";
import { appUrl } from "@/lib/email/templates";
import { env } from "@/lib/env";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";

function stripeClient() {
  if (!env.stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is required for Stripe Identity.");
  }

  return new Stripe(env.stripeSecretKey, {
    apiVersion: "2026-05-27.dahlia",
  });
}

function safePhone(phone: string | null | undefined) {
  return phone?.trim().startsWith("+") ? phone.trim() : undefined;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const service = createSupabaseServiceClient();

  if (!supabase || !service) {
    return NextResponse.redirect(
      new URL("/dashboard?view=profile&identity=missing_supabase", request.url),
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
      new URL("/dashboard?view=profile&identity=missing_stripe", request.url),
      { status: 303 },
    );
  }

  const { data: profile } = await service
    .from("profiles")
    .select("role, full_name, first_name, last_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  const { data: latest } = await service
    .from("identity_verification_checks")
    .select("status, provider_url")
    .eq("user_id", user.id)
    .eq("provider", "stripe_identity")
    .eq("check_type", "id_document")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest?.status === "verified") {
    return NextResponse.redirect(
      new URL("/dashboard?view=profile&identity=already_verified", request.url),
      { status: 303 },
    );
  }

  if (latest?.status === "pending" && latest.provider_url) {
    return NextResponse.redirect(latest.provider_url, { status: 303 });
  }

  const stripe = stripeClient();
  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    profile?.full_name ||
    user.email ||
    "Huntfields user";

  const session = await stripe.identity.verificationSessions.create({
    type: "document",
    client_reference_id: user.id,
    provided_details: {
      email: user.email ?? undefined,
      phone: safePhone(profile?.phone),
    },
    options: {
      document: {
        allowed_types: ["driving_license", "id_card", "passport"],
        require_live_capture: true,
        require_matching_selfie: true,
      },
    },
    return_url: appUrl("/dashboard?view=profile&identity=returned"),
    metadata: {
      huntfields_user_id: user.id,
      huntfields_role: profile?.role ?? "unknown",
      huntfields_display_name: displayName,
      verification_layer: "identity",
    },
  });

  if (!session.url) {
    return NextResponse.redirect(
      new URL("/dashboard?view=profile&identity=session_failed", request.url),
      { status: 303 },
    );
  }

  await service.from("identity_verification_checks").insert({
    user_id: user.id,
    provider: "stripe_identity",
    check_type: "id_document",
    status: "pending",
    provider_session_id: session.id,
    provider_url: session.url,
    consent_at: new Date().toISOString(),
    metadata: {
      stripe_status: session.status,
      type: session.type,
      role: profile?.role ?? "unknown",
      return_url: appUrl("/dashboard?view=profile&identity=returned"),
    },
  });

  return NextResponse.redirect(session.url, { status: 303 });
}

