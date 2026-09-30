const base = () => process.env.PAWAPAY_BASE_URL || "https://api.sandbox.pawapay.io";
const headers = () => ({ Authorization: `Bearer ${process.env.PAWAPAY_API_TOKEN}`, "Content-Type": "application/json" });

// Numéro au format international sans "+" (ex : 237699898475). pawaPay refuse les numéros sans indicatif.
export function toMsisdn(phone: string | null | undefined, dial: string) {
  let d = String(phone ?? "").replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith(dial)) return d;
  // Côte d'Ivoire : le 0 initial fait partie du numéro (10 chiffres). Ailleurs, on retire le 0 national.
  if (dial !== "225") d = d.replace(/^0+/, "");
  return dial + d;
}

export async function createPaymentPage(o: {
  depositId: string; amount: number; currency: string; country: string; returnUrl: string; phone?: string | null;
}): Promise<string> {
  const res = await fetch(`${base()}/v2/paymentpage`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      depositId: o.depositId,
      returnUrl: o.returnUrl,
      amountDetails: { amount: String(o.amount), currency: o.currency },
      country: o.country,
      ...(o.phone ? { phoneNumber: o.phone } : {}),
      reason: "Videos Sokozia",
      customerMessage: "Sokozia",
      language: "FR",
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.redirectUrl) {
    const msg = json.failureReason?.failureMessage || `pawapay ${res.status}`;
    // Numéro refusé ou opérateur non activé sur le compte pawaPay : on relance sans numéro,
    // la page pawaPay laisse alors le client choisir un opérateur disponible.
    if (o.phone && (/phone/i.test(msg) || json.failureReason?.failureCode === "DEPOSITS_NOT_ALLOWED"))
      return createPaymentPage({ ...o, phone: null });
    throw new Error(msg);
  }
  return json.redirectUrl as string;
}

// Toujours revérifier le statut auprès de pawaPay (ne jamais faire confiance au callback seul).
export async function depositStatus(depositId: string) {
  const res = await fetch(`${base()}/v2/deposits/${depositId}`, { headers: headers(), cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  const d = json.data ?? json;
  return {
    status: String(d.status ?? "").toUpperCase(), // COMPLETED | FAILED | ACCEPTED | SUBMITTED | ...
    amount: Number(d.amount ?? 0),
    currency: String(d.currency ?? ""),
    provider: d.payer?.accountDetails?.provider ?? null,
    raw: json,
  };
}
