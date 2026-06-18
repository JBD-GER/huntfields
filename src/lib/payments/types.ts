export type CheckoutInput = {
  bookingId: string;
  listingTitle: string;
  amountCents: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  connectedAccountId?: string;
  platformFeeCents?: number;
};

export type CheckoutResult = {
  provider: "manual" | "stripe";
  checkoutId: string | null;
  checkoutUrl: string | null;
  requiresLiveKeys: boolean;
};

export interface PaymentProvider {
  name: "manual" | "stripe";
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
}
