import "server-only";
import { getDb, now } from "../db";
import type { Generation, Order, User } from "../types";
import { paymentProvider } from "../providers";
import type { PaymentCheck } from "../providers/types";
import { appUrl } from "../auth";
import { DEFAULT_COUNTRY, isPayCountry, localAmount } from "../pricing";
import { submitGeneration } from "./generations";

/**
 * Pay-per-video: one order pays exactly one generation. The amount is the
 * price stored on the generation when the brief was launched.
 */
export async function createOrder(input: { user: User; generation: Generation; country?: string | null }): Promise<{ order: Order; redirectUrl: string }> {
  const db = await getDb();
  const g = input.generation;
  const provider = paymentProvider();
  const country = isPayCountry(input.country) ? input.country : DEFAULT_COUNTRY;

  const order = await db.insert<Order>("orders", {
    user_id: input.user.id,
    style: g.style,
    duration: g.duration,
    amount: g.price,
    // amount stays the FCFA price; the local amount charged is derived from it.
    currency: localAmount(country, g.price).currency,
    country,
    provider: provider.name,
    checkout_code: null,
    redirect_url: null,
    status: "pending",
    generation_id: g.id,
    thread_id: g.thread_id,
    failure: null,
    raw: null,
    created_at: now(),
    updated_at: now(),
  });
  await db.update<Generation>("generations", g.id, { order_id: order.id, updated_at: now() });

  const returnUrl = `${appUrl()}/paiement/retour?order=${order.id}`;
  const checkout = await provider.createCheckout({ order, returnUrl, userEmail: input.user.email });
  const updated = await db.update<Order>("orders", order.id, {
    checkout_code: checkout.checkoutCode,
    redirect_url: checkout.redirectUrl,
    raw: checkout.raw ?? null,
    updated_at: now(),
  });
  return { order: updated ?? order, redirectUrl: checkout.redirectUrl };
}

/** Asks the provider for the latest state and applies it. */
export async function syncOrder(order: Order): Promise<Order> {
  if (order.status !== "pending") return order;
  let check: PaymentCheck;
  try {
    check = await paymentProvider().checkStatus(order);
  } catch {
    return order;
  }
  return applyPayment(order, check);
}

/**
 * Idempotent transition. Only the first move to `completed` starts the
 * generation; callbacks and polling can both call this safely.
 */
export async function applyPayment(order: Order, check: PaymentCheck): Promise<Order> {
  const db = await getDb();
  const fresh = (await db.get<Order>("orders", order.id)) ?? order;
  if (fresh.status !== "pending" || check.status === "pending") return fresh;

  if (check.status === "completed") {
    const updated = (await db.update<Order>("orders", fresh.id, { status: "completed", raw: check.raw ?? fresh.raw, updated_at: now() })) ?? fresh;
    if (updated.generation_id) {
      const g = await db.get<Generation>("generations", updated.generation_id);
      if (g && g.status === "awaiting_payment") await submitGeneration(g);
    }
    return updated;
  }
  return (
    (await db.update<Order>("orders", fresh.id, {
      status: check.status,
      failure: check.failure ?? null,
      raw: check.raw ?? fresh.raw,
      updated_at: now(),
    })) ?? fresh
  );
}
