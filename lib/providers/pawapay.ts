import "server-only";
import type { CheckoutInput, CheckoutResult, PaymentCheck, PaymentProvider } from "./types";
import { amountsForCountries, CHECKOUT_COUNTRIES } from "../pricing";
import type { Order } from "../types";

function base(): string {
  return process.env.PAWAPAY_ENV === "production" ? "https://api.pawapay.io" : "https://api.sandbox.pawapay.io";
}

function token(): string {
  const t = process.env.PAWAPAY_API_TOKEN;
  if (!t) throw new Error("pawaPay n'est pas configuré (PAWAPAY_API_TOKEN).");
  return t;
}

async function pp<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as T & { failureReason?: { failureMessage?: string } };
  if (!res.ok) {
    throw new Error(`pawaPay ${res.status}: ${json?.failureReason?.failureMessage ?? JSON.stringify(json)?.slice(0, 200)}`);
  }
  return json;
}

interface CheckoutResponse {
  checkoutId: string;
  status: "ACCEPTED" | "REJECTED" | "DUPLICATE_IGNORED";
  redirectUrl?: string;
  checkoutCode?: string;
  expiresAt?: string;
  failureReason?: { failureCode: string; failureMessage: string };
}

interface CheckoutStatusResponse {
  status: "FOUND" | "NOT_FOUND";
  data?: {
    checkoutId: string;
    status: string; // ACCEPTED | PROCESSING | COMPLETED | FAILED | EXPIRED ...
    latestAttempt?: { status?: string; failureReason?: { failureCode?: string; failureMessage?: string } };
    failureReason?: { failureCode?: string; failureMessage?: string };
  } & Record<string, unknown>;
}

/** 4–22 chars, letters/digits/spaces only. */
function reason(order: Order): string {
  return `Sokozia video ${order.duration}s`.replace(/[^A-Za-z0-9 ]/g, "").slice(0, 22);
}

export const pawapayPayment: PaymentProvider = {
  name: "pawapay",
  async createCheckout({ order, returnUrl, userEmail }: CheckoutInput): Promise<CheckoutResult> {
    const body = {
      checkoutId: order.id,
      returnUrl,
      returnMethod: "INSTANT",
      defaultLanguage: "fr",
      countries: CHECKOUT_COUNTRIES,
      amounts: amountsForCountries(order.amount),
      expiresAfter: 20,
      clientReferenceId: order.id,
      reason: { fr: reason(order), en: reason(order) },
      metadata: [
        { orderId: order.id },
        { userId: order.user_id, isPII: true },
        { email: userEmail, isPII: true },
      ],
    };
    const res = await pp<CheckoutResponse>("/v2/checkouts", { method: "POST", body: JSON.stringify(body) });
    if (res.status === "REJECTED" || !res.redirectUrl) {
      throw new Error(res.failureReason?.failureMessage ?? "Paiement refusé par pawaPay.");
    }
    return { redirectUrl: res.redirectUrl, checkoutCode: res.checkoutCode ?? null, raw: res as unknown as Record<string, unknown> };
  },

  async checkStatus(order): Promise<PaymentCheck> {
    const res = await pp<CheckoutStatusResponse>(`/v2/checkouts/${order.id}`);
    if (res.status !== "FOUND" || !res.data) return { status: "pending" };
    return mapCheckoutStatus(res.data);
  },
};

export function mapCheckoutStatus(data: NonNullable<CheckoutStatusResponse["data"]>): PaymentCheck {
  const s = String(data.status ?? "").toUpperCase();
  const failure = data.failureReason?.failureMessage ?? data.latestAttempt?.failureReason?.failureMessage ?? null;
  if (s === "COMPLETED") return { status: "completed", raw: data };
  if (s === "FAILED") return { status: "failed", failure, raw: data };
  if (s === "EXPIRED") return { status: "expired", failure: "Le paiement a expiré.", raw: data };
  return { status: "pending", raw: data };
}
