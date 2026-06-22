export type CheckoutInput = {
  bookingId: string;
  listingTitle: string;
  amountCents: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  customerId?: string;
  customerEmail?: string;
  customerName?: string;
  connectedAccountId?: string;
  platformFeeCents?: number;
  transferGroup?: string;
};

export type CheckoutResult = {
  provider: "manual" | "stripe";
  checkoutId: string | null;
  checkoutUrl: string | null;
  customerId?: string | null;
  requiresLiveKeys: boolean;
};

export interface PaymentProvider {
  name: "manual" | "stripe";
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
}
