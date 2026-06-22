import Stripe from "stripe";
import { env } from "@/lib/env";

export function createStripeClient() {
  if (!env.stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is required for Stripe.");
  }

  return new Stripe(env.stripeSecretKey, {
    apiVersion: "2026-05-27.dahlia",
  });
}
