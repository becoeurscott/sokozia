import "server-only";
import type { PaymentProvider, VideoProvider } from "./types";
import { mockPayment, mockVideo } from "./mock";
import { hfCredentials, higgsfieldVideo } from "./higgsfield";
import { pawapayPayment } from "./pawapay";

export function isMock(): boolean {
  return process.env.MOCK_PROVIDERS !== "0";
}

export function videoProvider(): VideoProvider {
  if (isMock() || !hfCredentials()) return mockVideo;
  return higgsfieldVideo;
}

export function paymentProvider(): PaymentProvider {
  if (isMock() || !process.env.PAWAPAY_API_TOKEN) return mockPayment;
  return pawapayPayment;
}
