import Stripe from "stripe";
import { env } from "@/lib/env";
import type {
  CheckoutInput,
  CheckoutResult,
  PaymentProvider,
} from "@/lib/payments/types";

export class StripePaymentProvider implements PaymentProvider {
  name = "stripe" as const;
  private stripe: Stripe;

  constructor() {
    if (!env.stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY is required for Stripe payments.");
    }

    this.stripe = new Stripe(env.stripeSecretKey, {
      apiVersion: "2026-05-27.dahlia",
    });
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const session = await this.stripe.checkout.sessions.create({
      mode: "payment",
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      customer_email: input.customerEmail,
      client_reference_id: input.bookingId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: input.amountCents,
            product_data: {
              name: input.listingTitle,
              metadata: {
                booking_id: input.bookingId,
              },
            },
          },
        },
      ],
      payment_intent_data: input.connectedAccountId
        ? {
            application_fee_amount: input.platformFeeCents,
            transfer_data: {
              destination: input.connectedAccountId,
            },
          }
        : undefined,
      metadata: {
        booking_id: input.bookingId,
      },
    });

    return {
      provider: "stripe",
      checkoutId: session.id,
      checkoutUrl: session.url,
      requiresLiveKeys: true,
    };
  }
}
