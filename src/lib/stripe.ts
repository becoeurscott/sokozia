// Stripe Checkout via l'API REST (pas de SDK). Clé secrète serveur uniquement.
const API = "https://api.stripe.com/v1";
const ZERO_DECIMAL = new Set(["XOF", "XAF", "RWF", "UGX", "GNF", "KMF", "MGA", "BIF", "DJF"]);

export const stripeReady = () => Boolean(process.env.STRIPE_SECRET_KEY);

async function call(path: string, init: { method: string; form?: Record<string, string> }) {
  const r = await fetch(`${API}${path}`, {
    method: init.method,
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: init.form ? new URLSearchParams(init.form).toString() : undefined,
    cache: "no-store",
  });
  const body = await r.json();
  if (!r.ok) throw new Error(body?.error?.message ?? `Stripe ${r.status}`);
  return body;
}

export async function createCheckout(o: { paymentId: string; amount: number; currency: string; label: string; email?: string; returnUrl: string }) {
  const cur = o.currency.toUpperCase();
  const unit = ZERO_DECIMAL.has(cur) ? o.amount : Math.round(o.amount * 100);
  const s = await call("/checkout/sessions", {
    method: "POST",
    form: {
      mode: "payment",
      client_reference_id: o.paymentId,
      "metadata[payment_id]": o.paymentId,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": cur.toLowerCase(),
      "line_items[0][price_data][unit_amount]": String(unit),
      "line_items[0][price_data][product_data][name]": o.label,
      success_url: o.returnUrl,
      cancel_url: o.returnUrl,
      locale: "fr",
      ...(o.email ? { customer_email: o.email } : {}),
    },
  });
  return { id: s.id as string, url: s.url as string };
}

/** Statut normalisé d'une session Checkout. */
export async function checkoutStatus(sessionId: string) {
  const s = await call(`/checkout/sessions/${sessionId}`, { method: "GET" });
  const cur = String(s.currency ?? "").toUpperCase();
  const amount = ZERO_DECIMAL.has(cur) ? Number(s.amount_total) : Number(s.amount_total) / 100;
  const status = s.payment_status === "paid" ? "COMPLETED" : s.status === "expired" ? "FAILED" : "PENDING";
  return { status, amount, currency: cur, provider: "CARD", raw: { id: s.id, status: s.status, payment_status: s.payment_status } };
}
