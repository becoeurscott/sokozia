import "server-only";
import type { CheckoutInput, CheckoutResult, PaymentCheck, PaymentProvider } from "./types";
import { DEFAULT_COUNTRY, localAmount } from "../pricing";
import type { Order } from "../types";

/**
 * pawaPay v2 Payment Page: the flow the Sokozia pawaPay account already
 * ran in production with the earlier app. We open a payment page for one
 * deposit (depositId = our order id), then always confirm the outcome with
 * GET /v2/deposits/{id}, never with the callback body alone.
 */
function base(): string {
  if (process.env.PAWAPAY_BASE_URL) return process.env.PAWAPAY_BASE_URL.replace(/\/$/, "");
  return process.env.PAWAPAY_ENV === "production" ? "https://api.pawapay.io" : "https://api.sandbox.pawapay.io";
}

function token(): string {
  const t = process.env.PAWAPAY_API_TOKEN;
  if (!t) throw new Error("pawaPay n'est pas configuré (PAWAPAY_API_TOKEN).");
  return t;
}

async function pp<T>(path: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; json: T }> {
  const res = await fetch(`${base()}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, json };
}

interface PageResponse {
  redirectUrl?: string;
  status?: string;
  failureReason?: { failureCode?: string; failureMessage?: string };
}

interface DepositResponse {
  status?: string; // FOUND | NOT_FOUND
  data?: {
    depositId?: string;
    status?: string; // ACCEPTED | SUBMITTED | ENQUEUED | PROCESSING | IN_RECONCILIATION | COMPLETED | FAILED
    amount?: string;
    currency?: string;
    failureReason?: { failureCode?: string; failureMessage?: string };
  } & Record<string, unknown>;
}

/** 4–22 letters, digits or spaces (pawaPay's customerMessage rule). */
function customerMessage(order: Order): string {
  return (order.purpose === "topup" ? "Sokozia recharge" : `Sokozia video ${order.duration}s`).replace(/[^A-Za-z0-9 ]/g, "").slice(0, 22);
}

/** pawaPay's reasons, in words a customer understands. */
const FAILURES: Record<string, string> = {
  PAYER_NOT_FOUND: "Ce numéro n'a pas de compte Mobile Money.",
  INSUFFICIENT_BALANCE: "Solde Mobile Money insuffisant.",
  PAYMENT_NOT_APPROVED: "Le paiement n'a pas été confirmé sur le téléphone.",
  PAYER_LIMIT_REACHED: "Limite de paiement atteinte sur ce compte Mobile Money.",
  UNSPECIFIED_FAILURE: "L'opérateur a refusé le paiement.",
};

export const pawapayPayment: PaymentProvider = {
  name: "pawapay",
  async createCheckout({ order, returnUrl, userEmail }: CheckoutInput): Promise<CheckoutResult> {
    const country = order.country ?? DEFAULT_COUNTRY;
    const { amount, currency } = localAmount(country, order.amount);
    const body = {
      depositId: order.id,
      returnUrl,
      amountDetails: { amount: String(amount), currency },
      country,
      reason: order.purpose === "topup" ? `Recharge Sokozia ${order.units ?? 1} vidéos` : `Vidéo pub Sokozia ${order.duration} s`,
      customerMessage: customerMessage(order),
      language: "FR",
      metadata: [{ orderId: order.id }, { userId: order.user_id, isPII: true }, { email: userEmail, isPII: true }],
    };
    const res = await pp<PageResponse>("/v2/paymentpage", { method: "POST", body: JSON.stringify(body) });
    if (!res.ok || !res.json.redirectUrl) {
      throw new Error(res.json.failureReason?.failureMessage ?? `Paiement refusé par pawaPay (${res.status}).`);
    }
    return { redirectUrl: res.json.redirectUrl, checkoutCode: null, raw: { amount, currency, country } };
  },

  async checkStatus(order): Promise<PaymentCheck> {
    const res = await pp<DepositResponse>(`/v2/deposits/${order.id}`);
    const d = res.json.data;
    // NOT_FOUND until the customer submits the payment page, which expires
    // after 15 min; past 30 min nothing can arrive any more.
    if (!res.ok || res.json.status !== "FOUND" || !d) {
      const age = Date.now() - Date.parse(order.created_at);
      return res.ok && age > 30 * 60_000 ? { status: "expired", failure: "La page de paiement a expiré." } : { status: "pending" };
    }
    const s = String(d.status ?? "").toUpperCase();
    if (s === "COMPLETED") {
      // Only accept the exact amount and currency we asked for.
      const expected = localAmount(order.country ?? DEFAULT_COUNTRY, order.amount);
      if (Number(d.amount) !== expected.amount || d.currency !== expected.currency) {
        return { status: "failed", failure: `Montant reçu (${d.amount} ${d.currency}) différent du prix.`, raw: d };
      }
      return { status: "completed", raw: d };
    }
    if (s === "FAILED") {
      const code = d.failureReason?.failureCode ?? "";
      return { status: "failed", failure: FAILURES[code] ?? d.failureReason?.failureMessage ?? "Le paiement a échoué.", raw: d };
    }
    return { status: "pending", raw: d };
  },
};
