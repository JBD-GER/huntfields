import { createStripeClient } from "@/lib/payments/stripe-client";
import type {
  CheckoutInput,
  CheckoutResult,
  PaymentProvider,
} from "@/lib/payments/types";

export class StripePaymentProvider implements PaymentProvider {
  name = "stripe" as const;
  private stripe;

  constructor() {
    this.stripe = createStripeClient();
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const metadata = {
      booking_id: input.bookingId,
      payment_kind: input.renewalCycleId ? "lease_renewal" : "initial_lease",
      renewal_cycle_id: input.renewalCycleId ?? "",
      connected_account_id: input.connectedAccountId ?? "",
      platform_fee_cents: String(input.platformFeeCents ?? 0),
    };

    const session = await this.stripe.checkout.sessions.create({
      mode: "payment",
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      ...(input.customerId
        ? {
            customer: input.customerId,
            customer_update: {
              address: "auto" as const,
              name: "auto" as const,
            },
          }
        : {
            customer_email: input.customerEmail,
            customer_creation: "always" as const,
          }),
      automatic_tax: {
        enabled: true,
        liability: {
          type: "self",
        },
      },
      billing_address_collection: "auto",
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description: `Huntfields hunting lease payment for ${input.listingTitle}`,
          metadata,
        },
      },
      tax_id_collection: {
        enabled: true,
      },
      client_reference_id: input.bookingId,
      line_items: [
        {
          quantity: 1,
          metadata,
          price_data: {
            currency: input.currency.toLowerCase(),
            tax_behavior: "exclusive",
            unit_amount: input.amountCents,
            product_data: {
              name: input.listingTitle,
              metadata: {
                booking_id: input.bookingId,
                connected_account_id: input.connectedAccountId ?? "",
              },
            },
          },
        },
      ],
      payment_intent_data: input.connectedAccountId
        ? {
            transfer_group: input.transferGroup ?? input.bookingId,
            setup_future_usage: "off_session",
            metadata: {
              ...metadata,
              stripe_customer_id: input.customerId ?? "",
            },
          }
        : {
            transfer_group: input.transferGroup ?? input.bookingId,
            setup_future_usage: "off_session",
            metadata: {
              ...metadata,
              stripe_customer_id: input.customerId ?? "",
            },
          },
      metadata,
    });

    return {
      provider: "stripe",
      checkoutId: session.id,
      checkoutUrl: session.url,
      customerId:
        typeof session.customer === "string" ? session.customer : input.customerId,
      requiresLiveKeys: true,
    };
  }
}
