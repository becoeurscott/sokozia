import "server-only";
import type { CheckoutInput, CheckoutResult, PaymentCheck, PaymentProvider } from "./types";
import { getAdminClient } from "../insforge/server";
import { cardPriceCents, type Duration } from "../models";

/**
 * Card payments: Stripe Checkout through InsForge Payments (the Stripe key
 * and webhook live in InsForge). One catalog price per duration, in euros.
 * The outcome is read from the verified Stripe events InsForge stores,
 * through public.sz_stripe_checkout_status (migration 20261029143846),
 * never from the success URL.
 */
const ENV = (process.env.STRIPE_ENV === "test" ? "test" : "live") as "test" | "live";

/** Live catalog prices (lookup keys sokozia_video_15s_eur / 30s_eur): 3,87 € and 7,74 €. */
const PRICES: Record<Duration, string> = {
  15: process.env.STRIPE_PRICE_15 || "price_1UVum7QwaJ2X97H7z1zGpKm4",
  30: process.env.STRIPE_PRICE_30 || "price_1UVumPQwaJ2X97H7OOLA2G0J",
};
const CURRENCY = "eur";

export const stripeCardPayment: PaymentProvider = {
  name: "stripe",
  async createCheckout({ order, returnUrl, userEmail }: CheckoutInput): Promise<CheckoutResult> {
    const duration = order.duration as Duration;
    // InsForge only opens Checkout with the customer's own token (RLS on
    // payments.stripe_checkout_sessions, migration 20261029144234).
    const { cookies } = await import("next/headers");
    const { createServerClient } = await import("@insforge/sdk/ssr");
    const client = createServerClient({ cookies: await cookies() });
    const { data, error } = await client.payments.stripe.createCheckoutSession(ENV, {
      mode: "payment",
      lineItems: [{ priceId: PRICES[duration], quantity: 1 }],
      successUrl: returnUrl,
      cancelUrl: `${returnUrl}&cancel=1`,
      subject: { type: "user", id: order.user_id },
      customerEmail: userEmail || null,
      metadata: { sz_order_id: order.id, duration: String(order.duration) },
      idempotencyKey: `sz-order:${order.id}`,
    });
    const url = data?.checkoutSession.url;
    if (error || !url) throw new Error(error?.message ?? data?.checkoutSession.lastError ?? "Paiement par carte indisponible.");
    return { redirectUrl: url, checkoutCode: data.checkoutSession.checkoutSessionId, raw: { stripeSession: data.checkoutSession.id } };
  },

  async checkStatus(order): Promise<PaymentCheck> {
    const { data, error } = await getAdminClient().database.rpc("sz_stripe_checkout_status", { p_order_id: order.id });
    if (error || !data) return { status: "pending" };
    const r = data as { status: string; amount: number | null; currency: string | null; session: string | null };
    if (r.status === "paid") {
      // Only the exact price of this order counts. Orders opened before card
      // payments moved to euros were charged in FCFA (XOF) at order.amount.
      const eur = (order.currency ?? "").toUpperCase() === "EUR";
      const expected = eur ? cardPriceCents(order.duration as Duration) : order.amount;
      const currency = eur ? CURRENCY : "xof";
      if (Number(r.amount) !== expected || (r.currency ?? "").toLowerCase() !== currency) {
        return { status: "failed", failure: `Montant reçu (${r.amount} ${r.currency}) différent du prix.`, raw: r };
      }
      return { status: "completed", raw: r };
    }
    if (r.status === "failed") return { status: "failed", failure: "La carte a été refusée.", raw: r };
    if (r.status === "expired") return { status: "expired", failure: "Le paiement par carte a expiré.", raw: r };
    return { status: "pending", raw: r };
  },
};
