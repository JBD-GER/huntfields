import { NextResponse } from "next/server";
import Stripe from "stripe";
import { appUrl, emailTemplates } from "@/lib/email/templates";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { env } from "@/lib/env";
import { createStripeClient } from "@/lib/payments/stripe-client";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

type ServiceClient = NonNullable<ReturnType<typeof createSupabaseServiceClient>>;

function stripeId(
  value:
    | string
    | { id?: string | null }
    | Stripe.DeletedCustomer
    | null
    | undefined,
) {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.id ?? null;
}

function paymentMethodSummary(intent: Stripe.PaymentIntent | null) {
  if (!intent) {
    return { type: null, summary: null };
  }

  const paymentMethod =
    typeof intent.payment_method === "string" ? null : intent.payment_method;
  const charge =
    typeof intent.latest_charge === "string" ? null : intent.latest_charge;
  const type =
    paymentMethod?.type ??
    (charge as Stripe.Charge | null)?.payment_method_details?.type ??
    null;

  if (paymentMethod?.card) {
    return {
      type,
      summary: `${paymentMethod.card.brand?.toUpperCase() ?? "Card"} **** ${
        paymentMethod.card.last4
      }`,
    };
  }

  const chargeCard = (charge as Stripe.Charge | null)?.payment_method_details?.card;
  if (chargeCard) {
    return {
      type,
      summary: `${chargeCard.brand?.toUpperCase() ?? "Card"} **** ${
        chargeCard.last4
      }`,
    };
  }

  return {
    type,
    summary: type ? type.replaceAll("_", " ") : null,
  };
}

async function invoiceSummary(stripe: Stripe, invoiceId: string | null) {
  if (!invoiceId) {
    return {
      providerInvoiceId: null,
      providerInvoiceUrl: null,
      providerInvoicePdf: null,
    };
  }

  const invoice = await stripe.invoices.retrieve(invoiceId);

  return {
    providerInvoiceId: invoice.id,
    providerInvoiceUrl: invoice.hosted_invoice_url ?? null,
    providerInvoicePdf: invoice.invoice_pdf ?? null,
  };
}

async function notifySignatureReady(service: ServiceClient, bookingId: string) {
  const { data: contract } = await service
    .from("booking_contracts")
    .select("id, title, hunter_id, landowner_id")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (!contract) {
    return;
  }

  const [hunter, landowner] = await Promise.all([
    service.auth.admin.getUserById(contract.hunter_id),
    service.auth.admin.getUserById(contract.landowner_id),
  ]);
  const contractUrl = appUrl(`/contracts/${contract.id}`);

  if (landowner.data.user?.email) {
    const template = emailTemplates.ownerSignatureReady(
      contract.title,
      contractUrl,
    );
    await sendTransactionalEmail({
      to: landowner.data.user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  if (hunter.data.user?.email) {
    const template = emailTemplates.bookingStatus(
      contract.title,
      "paid - waiting for landowner signature",
      contractUrl,
    );
    await sendTransactionalEmail({
      to: hunter.data.user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }
}

async function markCheckoutPaid({
  stripe,
  service,
  session,
  eventType,
}: {
  stripe: Stripe;
  service: ServiceClient;
  session: Stripe.Checkout.Session;
  eventType: string;
}) {
  const bookingId = session.client_reference_id ?? session.metadata?.booking_id;

  if (!bookingId) {
    return;
  }

  if (
    eventType === "checkout.session.completed" &&
    session.payment_status !== "paid"
  ) {
    await Promise.all([
      service
        .from("booking_payment_intents")
        .update({
          status: "checkout_created",
          provider_checkout_id: session.id,
          provider_customer_id: stripeId(session.customer),
          tax_amount_cents: session.total_details?.amount_tax ?? 0,
          tax_status: session.automatic_tax?.status ?? null,
        })
        .eq("booking_id", bookingId),
      service
        .from("bookings")
        .update({
          payment_status: "payment_processing",
          workflow_stage: "payment_processing",
          provider_checkout_id: session.id,
          provider_customer_id: stripeId(session.customer),
          tax_amount_cents: session.total_details?.amount_tax ?? 0,
        })
        .eq("id", bookingId),
    ]);
    return;
  }

  const paymentIntentId = stripeId(session.payment_intent);
  const invoiceId = stripeId(session.invoice);
  const invoice = await invoiceSummary(stripe, invoiceId);
  let chargeId: string | null = null;
  let receiptUrl: string | null = null;
  let intent: Stripe.PaymentIntent | null = null;

  if (paymentIntentId) {
    intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge", "payment_method"],
    });
    const charge =
      typeof intent.latest_charge === "string" ? null : intent.latest_charge;
    chargeId = stripeId(intent.latest_charge);
    receiptUrl = (charge as Stripe.Charge | null)?.receipt_url ?? null;
  }

  const method = paymentMethodSummary(intent);
  const { error: paidError } = await service.rpc("mark_booking_paid", {
    p_booking_id: bookingId,
    p_provider_checkout_id: session.id,
    p_provider_payment_id: paymentIntentId,
    p_provider_charge_id: chargeId,
    p_provider_customer_id: stripeId(session.customer),
    p_provider_invoice_id: invoice.providerInvoiceId,
    p_provider_invoice_url: invoice.providerInvoiceUrl,
    p_provider_invoice_pdf: invoice.providerInvoicePdf,
    p_tax_amount_cents: session.total_details?.amount_tax ?? 0,
    p_receipt_url: receiptUrl,
    p_payment_method_type: method.type,
    p_payment_method_summary: method.summary,
  });

  if (paidError) {
    throw new Error(paidError.message);
  }

  await Promise.all([
    service.from("booking_workflow_events").insert({
      booking_id: bookingId,
      event_type: "stripe_checkout_paid",
      payload: {
        event_type: eventType,
        checkout_session_id: session.id,
        payment_intent: paymentIntentId,
        charge_id: chargeId,
        invoice_id: invoice.providerInvoiceId,
        customer_id: stripeId(session.customer),
        tax_amount_cents: session.total_details?.amount_tax ?? 0,
        tax_status: session.automatic_tax?.status ?? null,
      },
    }),
    service
      .from("booking_payment_intents")
      .update({
        tax_status: session.automatic_tax?.status ?? null,
      })
      .eq("booking_id", bookingId)
      .eq("provider_checkout_id", session.id),
  ]);

  await notifySignatureReady(service, bookingId);
}

async function syncCheckoutFailure({
  service,
  session,
  status,
  eventType,
}: {
  service: ServiceClient;
  session: Stripe.Checkout.Session;
  status: "failed" | "cancelled";
  eventType: string;
}) {
  const bookingId = session.client_reference_id ?? session.metadata?.booking_id;

  if (!bookingId) {
    return;
  }

  await Promise.all([
    service
      .from("booking_payment_intents")
      .update({
        status,
        provider_checkout_id: session.id,
        provider_customer_id: stripeId(session.customer),
        error_message: eventType,
      })
      .eq("booking_id", bookingId)
      .neq("status", "paid"),
    service
      .from("bookings")
      .update({
        payment_status: status === "failed" ? "payment_failed" : "payment_due",
        workflow_stage: "payment_due",
      })
      .eq("id", bookingId)
      .neq("payment_status", "paid"),
    service.from("booking_workflow_events").insert({
      booking_id: bookingId,
      event_type: eventType.replaceAll(".", "_"),
      payload: {
        checkout_session_id: session.id,
        payment_status: session.payment_status,
      },
    }),
  ]);
}

async function syncPaymentIntentStatus({
  service,
  intent,
  status,
  eventType,
}: {
  service: ServiceClient;
  intent: Stripe.PaymentIntent;
  status: "failed" | "cancelled";
  eventType: string;
}) {
  const bookingId = intent.metadata?.booking_id;
  const chargeId = stripeId(intent.latest_charge);

  if (bookingId) {
    await Promise.all([
      service
        .from("booking_payment_intents")
        .update({
          status,
          provider_payment_id: intent.id,
          provider_charge_id: chargeId,
          error_message:
            intent.last_payment_error?.message ??
            intent.cancellation_reason ??
            eventType,
        })
        .eq("booking_id", bookingId)
        .neq("status", "paid"),
      service
        .from("bookings")
        .update({
          payment_status: status === "failed" ? "payment_failed" : "payment_due",
          workflow_stage: "payment_due",
          provider_payment_id: intent.id,
          provider_charge_id: chargeId,
        })
        .eq("id", bookingId)
        .neq("payment_status", "paid"),
      service.from("booking_workflow_events").insert({
        booking_id: bookingId,
        event_type: eventType.replaceAll(".", "_"),
        payload: {
          payment_intent: intent.id,
          charge_id: chargeId,
          error: intent.last_payment_error?.message ?? null,
        },
      }),
    ]);
    return;
  }

  await service
    .from("booking_payment_intents")
    .update({
      status,
      provider_charge_id: chargeId,
      error_message:
        intent.last_payment_error?.message ?? intent.cancellation_reason ?? eventType,
    })
    .eq("provider_payment_id", intent.id)
    .neq("status", "paid");
}

async function syncInvoice({
  service,
  invoice,
  status,
}: {
  service: ServiceClient;
  invoice: Stripe.Invoice;
  status?: "paid" | "failed" | "cancelled";
}) {
  const bookingId = invoice.metadata?.booking_id;

  if (!bookingId) {
    return;
  }

  const payload = {
    provider_invoice_id: invoice.id,
    provider_invoice_url: invoice.hosted_invoice_url ?? null,
    provider_invoice_pdf: invoice.invoice_pdf ?? null,
    provider_customer_id: stripeId(invoice.customer),
    tax_amount_cents: (invoice.total_taxes ?? []).reduce(
      (sum, tax) => sum + tax.amount,
      0,
    ),
  };

  await Promise.all([
    service
      .from("booking_payment_intents")
      .update({
        ...payload,
        ...(status && status !== "paid" ? { status } : {}),
      })
      .eq("booking_id", bookingId),
    service
      .from("bookings")
      .update({
        ...payload,
        ...(status === "failed"
          ? { payment_status: "payment_failed", workflow_stage: "payment_due" }
          : {}),
      })
      .eq("id", bookingId),
    service.from("booking_workflow_events").insert({
      booking_id: bookingId,
      event_type: `stripe_invoice_${invoice.status ?? "updated"}`,
      payload: {
        invoice_id: invoice.id,
        hosted_invoice_url: invoice.hosted_invoice_url,
        invoice_pdf: invoice.invoice_pdf,
        invoice_status: invoice.status,
      },
    }),
  ]);
}

async function syncTransfer({
  service,
  transfer,
  eventType,
}: {
  service: ServiceClient;
  transfer: Stripe.Transfer;
  eventType: string;
}) {
  const bookingId =
    transfer.metadata?.booking_id ||
    (typeof transfer.transfer_group === "string" ? transfer.transfer_group : null);

  if (!bookingId) {
    return;
  }

  const status =
    eventType === "transfer.reversed"
      ? "reversed"
      : eventType === "transfer.updated"
        ? "updated"
        : "created";

  await Promise.all([
    service
      .from("bookings")
      .update({
        owner_transfer_id: transfer.id,
        owner_transfer_status: status,
      })
      .eq("id", bookingId),
    service
      .from("booking_payment_intents")
      .update({
        provider_transfer_id: transfer.id,
        transfer_status: status,
        transfer_error: null,
      })
      .eq("booking_id", bookingId),
    service.from("booking_workflow_events").insert({
      booking_id: bookingId,
      event_type: eventType.replaceAll(".", "_"),
      payload: {
        transfer_id: transfer.id,
        amount: transfer.amount,
        destination: stripeId(transfer.destination),
        transfer_group: transfer.transfer_group,
      },
    }),
  ]);
}

async function syncConnectedAccount(
  service: ServiceClient,
  account: Stripe.Account | { id?: string; object?: string },
) {
  if (!account.id) {
    return;
  }

  await service
    .from("payment_accounts")
    .update({
      charges_enabled: "charges_enabled" in account ? account.charges_enabled : undefined,
      payouts_enabled: "payouts_enabled" in account ? account.payouts_enabled : undefined,
      onboarding_status:
        "charges_enabled" in account && "payouts_enabled" in account
          ? account.charges_enabled && account.payouts_enabled
            ? "enabled"
            : "pending"
          : undefined,
      metadata: {
        stripe_object: account.object ?? "account",
        webhook_synced_at: new Date().toISOString(),
      },
    })
    .eq("provider", "stripe")
    .eq("provider_account_id", account.id);
}

async function syncIdentityVerification(
  service: ServiceClient,
  eventType: string,
  session: Stripe.Identity.VerificationSession,
) {
  const status =
    eventType === "identity.verification_session.verified"
      ? "verified"
      : eventType === "identity.verification_session.requires_input"
        ? "rejected"
        : eventType === "identity.verification_session.canceled"
          ? "rejected"
          : eventType === "identity.verification_session.redacted"
            ? "expired"
            : "pending";
  const errorSummary = session.last_error
    ? [session.last_error.code, session.last_error.reason]
        .filter(Boolean)
        .join(": ")
    : null;
  const { data: existing } = await service
    .from("identity_verification_checks")
    .select("id, user_id")
    .eq("provider", "stripe_identity")
    .eq("provider_session_id", session.id)
    .maybeSingle();
  const userId =
    existing?.user_id ||
    (typeof session.client_reference_id === "string"
      ? session.client_reference_id
      : null);
  const payload = {
    status,
    provider_url: session.url,
    result_summary: errorSummary,
    completed_at: status === "verified" ? new Date().toISOString() : null,
    metadata: {
      stripe_status: session.status,
      type: session.type,
      last_error: session.last_error ?? null,
      last_verification_report: session.last_verification_report ?? null,
    },
  };

  if (existing?.id) {
    await service
      .from("identity_verification_checks")
      .update(payload)
      .eq("id", existing.id);
  } else if (userId) {
    await service.from("identity_verification_checks").insert({
      ...payload,
      user_id: userId,
      provider: "stripe_identity",
      check_type: "id_document",
      provider_session_id: session.id,
      consent_at: new Date().toISOString(),
    });
  }
}

async function processEvent({
  stripe,
  service,
  event,
}: {
  stripe: Stripe;
  service: ServiceClient;
  event: Stripe.Event;
}) {
  if (event.type.startsWith("identity.verification_session.")) {
    await syncIdentityVerification(
      service,
      event.type,
      event.data.object as Stripe.Identity.VerificationSession,
    );
    return;
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await markCheckoutPaid({
        stripe,
        service,
        session: event.data.object as Stripe.Checkout.Session,
        eventType: event.type,
      });
      break;
    case "checkout.session.async_payment_failed":
      await syncCheckoutFailure({
        service,
        session: event.data.object as Stripe.Checkout.Session,
        status: "failed",
        eventType: event.type,
      });
      break;
    case "checkout.session.expired":
      await syncCheckoutFailure({
        service,
        session: event.data.object as Stripe.Checkout.Session,
        status: "cancelled",
        eventType: event.type,
      });
      break;
    case "payment_intent.payment_failed":
      await syncPaymentIntentStatus({
        service,
        intent: event.data.object as Stripe.PaymentIntent,
        status: "failed",
        eventType: event.type,
      });
      break;
    case "payment_intent.canceled":
      await syncPaymentIntentStatus({
        service,
        intent: event.data.object as Stripe.PaymentIntent,
        status: "cancelled",
        eventType: event.type,
      });
      break;
    case "invoice.finalized":
    case "invoice.paid":
      await syncInvoice({
        service,
        invoice: event.data.object as Stripe.Invoice,
        status: event.type === "invoice.paid" ? "paid" : undefined,
      });
      break;
    case "invoice.payment_failed":
      await syncInvoice({
        service,
        invoice: event.data.object as Stripe.Invoice,
        status: "failed",
      });
      break;
    case "invoice.voided":
      await syncInvoice({
        service,
        invoice: event.data.object as Stripe.Invoice,
        status: "cancelled",
      });
      break;
    case "transfer.created":
    case "transfer.updated":
    case "transfer.reversed":
      await syncTransfer({
        service,
        transfer: event.data.object as Stripe.Transfer,
        eventType: event.type,
      });
      break;
    case "account.updated":
      await syncConnectedAccount(service, event.data.object as Stripe.Account);
      break;
    default:
      break;
  }
}

export async function POST(request: Request) {
  if (!env.stripeSecretKey || !env.stripeWebhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured." },
      { status: 500 },
    );
  }

  const stripe = createStripeClient();
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

  const { error: eventInsertError } = await service
    .from("stripe_webhook_events")
    .insert({
      event_id: event.id,
      event_type: event.type,
      payload: event as unknown as Record<string, unknown>,
    });

  if (eventInsertError?.code === "23505") {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (eventInsertError) {
    return NextResponse.json(
      { error: eventInsertError.message },
      { status: 500 },
    );
  }

  try {
    await processEvent({ stripe, service, event });
  } catch (error) {
    await service.from("stripe_webhook_events").delete().eq("event_id", event.id);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Stripe webhook processing failed.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
