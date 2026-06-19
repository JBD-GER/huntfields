import { NextResponse } from "next/server";
import Stripe from "stripe";
import { env } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!env.stripeSecretKey || !env.stripeWebhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured." },
      { status: 500 },
    );
  }

  const stripe = new Stripe(env.stripeSecretKey, {
    apiVersion: "2026-05-27.dahlia",
  });
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      await request.text(),
      signature,
      env.stripeWebhookSecret,
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Stripe webhook signature verification failed.",
      },
      { status: 400 },
    );
  }

  const service = createSupabaseServiceClient();

  if (!service) {
    return NextResponse.json(
      { error: "Supabase service role is required." },
      { status: 500 },
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId =
      session.client_reference_id ?? session.metadata?.booking_id ?? null;

    if (bookingId) {
      await service.rpc("mark_booking_paid", {
        p_booking_id: bookingId,
        p_provider_checkout_id: session.id,
        p_provider_payment_id:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null,
      });

      await service.from("booking_workflow_events").insert({
        booking_id: bookingId,
        event_type: "stripe_checkout_completed",
        payload: {
          checkout_session_id: session.id,
          payment_intent: session.payment_intent,
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}
