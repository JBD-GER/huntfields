import type Stripe from "stripe";
import { createStripeClient } from "@/lib/payments/stripe-client";
import type { createSupabaseServiceClient } from "@/lib/supabase/server";

type ServiceClient = NonNullable<ReturnType<typeof createSupabaseServiceClient>>;

type EnsureStripeCustomerInput = {
  supabase: ServiceClient;
  userId: string;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
  metadata?: Record<string, string>;
  stripe?: Stripe;
};

export async function ensureStripeCustomer({
  supabase,
  userId,
  email,
  name,
  phone,
  metadata,
  stripe = createStripeClient(),
}: EnsureStripeCustomerInput) {
  const { data: existing } = await supabase
    .from("stripe_customers")
    .select("provider_customer_id")
    .eq("user_id", userId)
    .eq("provider", "stripe")
    .maybeSingle();

  if (existing?.provider_customer_id) {
    return existing.provider_customer_id;
  }

  const customer = await stripe.customers.create({
    email: email ?? undefined,
    name: name ?? undefined,
    phone: phone ?? undefined,
    metadata: {
      huntfields_user_id: userId,
      ...(metadata ?? {}),
    },
  });

  await supabase.from("stripe_customers").upsert(
    {
      user_id: userId,
      provider: "stripe",
      provider_customer_id: customer.id,
      email: customer.email ?? email ?? null,
      default_currency: "USD",
      metadata: {
        name: customer.name ?? name ?? null,
        phone: customer.phone ?? phone ?? null,
      },
    },
    { onConflict: "user_id,provider" },
  );

  return customer.id;
}
