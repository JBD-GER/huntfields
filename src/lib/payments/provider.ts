import { env } from "@/lib/env";
import { ManualPaymentProvider } from "@/lib/payments/noop-provider";
import { StripePaymentProvider } from "@/lib/payments/stripe-provider";
import type { PaymentProvider } from "@/lib/payments/types";

export function getPaymentProvider(): PaymentProvider {
  if (env.stripeSecretKey) {
    return new StripePaymentProvider();
  }

  return new ManualPaymentProvider();
}
