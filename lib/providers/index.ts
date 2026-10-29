import "server-only";
import type { PaymentProvider, VideoProvider } from "./types";
import { mockPayment, mockVideo } from "./mock";
import { hfCredentials, higgsfieldVideo } from "./higgsfield";
import { pawapayPayment } from "./pawapay";
import { stripeCardPayment } from "./stripe";
import type { Order } from "../types";

export type PayMethod = "mobile" | "card";

export function isMock(): boolean {
  return process.env.MOCK_PROVIDERS !== "0";
}

export function videoProvider(): VideoProvider {
  if (isMock() || !hfCredentials()) return mockVideo;
  return higgsfieldVideo;
}

/** Mobile Money goes through pawaPay, cards through Stripe (InsForge Payments). */
export function paymentProvider(method: PayMethod = "mobile"): PaymentProvider {
  if (isMock()) return mockPayment;
  if (method === "card") return stripeCardPayment;
  return process.env.PAWAPAY_API_TOKEN ? pawapayPayment : mockPayment;
}

/** The provider that holds an existing order. */
export function providerFor(order: Pick<Order, "provider">): PaymentProvider {
  if (order.provider === "stripe") return stripeCardPayment;
  if (order.provider === "pawapay") return pawapayPayment;
  return mockPayment;
}
