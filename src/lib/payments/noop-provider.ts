import type {
  CheckoutInput,
  CheckoutResult,
  PaymentProvider,
} from "@/lib/payments/types";

export class ManualPaymentProvider implements PaymentProvider {
  name = "manual" as const;

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    return {
      provider: "manual",
      checkoutId: `manual_${input.bookingId}`,
      checkoutUrl: null,
      requiresLiveKeys: false,
    };
  }
}
