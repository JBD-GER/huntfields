import { env } from "@/lib/env";
import { createStripeClient } from "@/lib/payments/stripe-client";
import type { createSupabaseServiceClient } from "@/lib/supabase/server";

type ServiceClient = NonNullable<ReturnType<typeof createSupabaseServiceClient>>;

type ReleaseInput = {
  supabase: ServiceClient;
  bookingId: string;
  contractId: string;
  actorId: string | null;
};

type RenewalReleaseInput = {
  supabase: ServiceClient;
  renewalCycleId: string;
  actorId: string | null;
};

function stripeClient() {
  if (!env.stripeSecretKey) {
    return null;
  }

  return createStripeClient();
}

export async function releaseOwnerPayoutTransfer({
  supabase,
  bookingId,
  contractId,
  actorId,
}: ReleaseInput) {
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, request_id, landowner_id, currency, landowner_payout_cents, provider_payment_id, provider_charge_id, owner_transfer_id",
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking || booking.owner_transfer_id) {
    return;
  }

  const { data: account } = await supabase
    .from("payment_accounts")
    .select("provider_account_id, payouts_enabled, charges_enabled")
    .eq("user_id", booking.landowner_id)
    .eq("provider", "stripe")
    .maybeSingle();

  const stripe = stripeClient();
  const amount = booking.landowner_payout_cents ?? 0;

  if (
    !stripe ||
    !account?.provider_account_id ||
    !account.payouts_enabled ||
    !account.charges_enabled ||
    amount <= 0
  ) {
    await Promise.all([
      supabase
        .from("bookings")
        .update({ owner_transfer_status: "manual_pending" })
        .eq("id", booking.id),
      supabase.from("booking_workflow_events").insert({
        booking_id: booking.id,
        request_id: booking.request_id,
        actor_id: actorId,
        event_type: "owner_payout_manual_pending",
        payload: {
          contract_id: contractId,
          reason:
            "Stripe Connect or payout amount is missing. Manual payout review is required.",
        },
      }),
    ]);
    return;
  }

  const { data: paymentIntent } = await supabase
    .from("booking_payment_intents")
    .select("id, provider_payment_id, provider_charge_id")
    .eq("booking_id", booking.id)
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let chargeId = paymentIntent?.provider_charge_id ?? booking.provider_charge_id;

  if (!chargeId && paymentIntent?.provider_payment_id) {
    const intent = await stripe.paymentIntents.retrieve(
      paymentIntent.provider_payment_id,
      { expand: ["latest_charge"] },
    );
    chargeId =
      typeof intent.latest_charge === "string"
        ? intent.latest_charge
        : intent.latest_charge?.id;
  }

  if (!chargeId) {
    await Promise.all([
      supabase
        .from("bookings")
        .update({ owner_transfer_status: "manual_pending" })
        .eq("id", booking.id),
      paymentIntent?.id
        ? supabase
            .from("booking_payment_intents")
            .update({
              transfer_status: "manual_pending",
              transfer_error:
                "Paid booking is missing a Stripe charge ID for source_transaction.",
            })
            .eq("id", paymentIntent.id)
        : Promise.resolve(),
      supabase.from("booking_workflow_events").insert({
        booking_id: booking.id,
        request_id: booking.request_id,
        actor_id: actorId,
        event_type: "owner_payout_manual_pending",
        payload: {
          contract_id: contractId,
          reason: "Paid booking is missing a Stripe charge ID.",
        },
      }),
    ]);
    return;
  }

  try {
    const transfer = await stripe.transfers.create({
      amount,
      currency: booking.currency.toLowerCase(),
      destination: account.provider_account_id,
      source_transaction: chargeId,
      transfer_group: booking.id,
      metadata: {
        booking_id: booking.id,
        contract_id: contractId,
        landowner_id: booking.landowner_id,
      },
    });

    await Promise.all([
      supabase
        .from("bookings")
        .update({
          owner_transfer_id: transfer.id,
          owner_transfer_status: "created",
        })
        .eq("id", booking.id),
      paymentIntent?.id
        ? supabase
            .from("booking_payment_intents")
            .update({
              provider_charge_id: chargeId,
              provider_transfer_id: transfer.id,
              transfer_status: "created",
              transfer_error: null,
            })
            .eq("id", paymentIntent.id)
        : Promise.resolve(),
      supabase.from("booking_workflow_events").insert({
        booking_id: booking.id,
        request_id: booking.request_id,
        actor_id: actorId,
        event_type: "owner_payout_transfer_created",
        payload: {
          contract_id: contractId,
          transfer_id: transfer.id,
          charge_id: chargeId,
          amount_cents: amount,
        },
      }),
    ]);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Stripe transfer could not be created.";

    await Promise.all([
      supabase
        .from("bookings")
        .update({ owner_transfer_status: "failed" })
        .eq("id", booking.id),
      paymentIntent?.id
        ? supabase
            .from("booking_payment_intents")
            .update({
              transfer_status: "failed",
              transfer_error: message,
            })
            .eq("id", paymentIntent.id)
        : Promise.resolve(),
      supabase.from("booking_workflow_events").insert({
        booking_id: booking.id,
        request_id: booking.request_id,
        actor_id: actorId,
        event_type: "owner_payout_transfer_failed",
        payload: {
          contract_id: contractId,
          error: message,
        },
      }),
    ]);
  }
}

export async function releaseRenewalPayoutTransfer({
  supabase,
  renewalCycleId,
  actorId,
}: RenewalReleaseInput) {
  const { data: cycle } = await supabase
    .from("booking_renewal_cycles")
    .select(
      "id, booking_id, request_id, landowner_id, currency, landowner_payout_cents, provider_charge_id, provider_transfer_id",
    )
    .eq("id", renewalCycleId)
    .maybeSingle();

  if (!cycle || cycle.provider_transfer_id) {
    return;
  }

  const { data: account } = await supabase
    .from("payment_accounts")
    .select("provider_account_id, payouts_enabled, charges_enabled")
    .eq("user_id", cycle.landowner_id)
    .eq("provider", "stripe")
    .maybeSingle();

  const stripe = stripeClient();
  const amount = cycle.landowner_payout_cents ?? 0;

  if (
    !stripe ||
    !account?.provider_account_id ||
    !account.payouts_enabled ||
    !account.charges_enabled ||
    amount <= 0
  ) {
    await Promise.all([
      supabase
        .from("booking_renewal_cycles")
        .update({ transfer_status: "manual_pending" })
        .eq("id", cycle.id),
      supabase
        .from("booking_payment_intents")
        .update({
          transfer_status: "manual_pending",
          transfer_error:
            "Stripe Connect or renewal payout amount is missing. Manual payout review is required.",
        })
        .eq("renewal_cycle_id", cycle.id),
      supabase.from("booking_workflow_events").insert({
        booking_id: cycle.booking_id,
        request_id: cycle.request_id,
        actor_id: actorId,
        event_type: "renewal_payout_manual_pending",
        payload: {
          renewal_cycle_id: cycle.id,
          reason:
            "Stripe Connect or renewal payout amount is missing. Manual payout review is required.",
        },
      }),
    ]);
    return;
  }

  const { data: paymentIntent } = await supabase
    .from("booking_payment_intents")
    .select("id, provider_payment_id, provider_charge_id")
    .eq("renewal_cycle_id", cycle.id)
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let chargeId = paymentIntent?.provider_charge_id ?? cycle.provider_charge_id;

  if (!chargeId && paymentIntent?.provider_payment_id) {
    const intent = await stripe.paymentIntents.retrieve(
      paymentIntent.provider_payment_id,
      { expand: ["latest_charge"] },
    );
    chargeId =
      typeof intent.latest_charge === "string"
        ? intent.latest_charge
        : intent.latest_charge?.id;
  }

  if (!chargeId) {
    await Promise.all([
      supabase
        .from("booking_renewal_cycles")
        .update({
          transfer_status: "manual_pending",
          transfer_error:
            "Paid renewal is missing a Stripe charge ID for source_transaction.",
        })
        .eq("id", cycle.id),
      paymentIntent?.id
        ? supabase
            .from("booking_payment_intents")
            .update({
              transfer_status: "manual_pending",
              transfer_error:
                "Paid renewal is missing a Stripe charge ID for source_transaction.",
            })
            .eq("id", paymentIntent.id)
        : Promise.resolve(),
      supabase.from("booking_workflow_events").insert({
        booking_id: cycle.booking_id,
        request_id: cycle.request_id,
        actor_id: actorId,
        event_type: "renewal_payout_manual_pending",
        payload: {
          renewal_cycle_id: cycle.id,
          reason: "Paid renewal is missing a Stripe charge ID.",
        },
      }),
    ]);
    return;
  }

  try {
    const transfer = await stripe.transfers.create({
      amount,
      currency: cycle.currency.toLowerCase(),
      destination: account.provider_account_id,
      source_transaction: chargeId,
      transfer_group: `${cycle.booking_id}:renewal:${cycle.id}`,
      metadata: {
        booking_id: cycle.booking_id,
        renewal_cycle_id: cycle.id,
        landowner_id: cycle.landowner_id,
      },
    });

    await Promise.all([
      supabase
        .from("booking_renewal_cycles")
        .update({
          provider_charge_id: chargeId,
          provider_transfer_id: transfer.id,
          transfer_status: "created",
          transfer_error: null,
        })
        .eq("id", cycle.id),
      paymentIntent?.id
        ? supabase
            .from("booking_payment_intents")
            .update({
              provider_charge_id: chargeId,
              provider_transfer_id: transfer.id,
              transfer_status: "created",
              transfer_error: null,
            })
            .eq("id", paymentIntent.id)
        : Promise.resolve(),
      supabase.from("booking_workflow_events").insert({
        booking_id: cycle.booking_id,
        request_id: cycle.request_id,
        actor_id: actorId,
        event_type: "renewal_payout_transfer_created",
        payload: {
          renewal_cycle_id: cycle.id,
          transfer_id: transfer.id,
          charge_id: chargeId,
          amount_cents: amount,
        },
      }),
    ]);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Stripe renewal transfer could not be created.";

    await Promise.all([
      supabase
        .from("booking_renewal_cycles")
        .update({ transfer_status: "failed", transfer_error: message })
        .eq("id", cycle.id),
      paymentIntent?.id
        ? supabase
            .from("booking_payment_intents")
            .update({
              transfer_status: "failed",
              transfer_error: message,
            })
            .eq("id", paymentIntent.id)
        : Promise.resolve(),
      supabase.from("booking_workflow_events").insert({
        booking_id: cycle.booking_id,
        request_id: cycle.request_id,
        actor_id: actorId,
        event_type: "renewal_payout_transfer_failed",
        payload: {
          renewal_cycle_id: cycle.id,
          error: message,
        },
      }),
    ]);
  }
}
