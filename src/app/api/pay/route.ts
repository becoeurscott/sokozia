import { NextResponse } from "next/server";
import { adminClient, getSession } from "@/lib/insforge";
import { COUNTRIES, currencyOf, loadPricing, planPrice, planVideos, type Plan } from "@/lib/pricing";
import { createPaymentPage, toMsisdn } from "@/lib/pawapay";
import { createCheckout, stripeReady } from "@/lib/stripe";

// Achat d'1 pub, d'un pack de 5 ou d'un mois, pour UN style et UNE durée.
// Avec conversationId (depuis le studio), la pub est créée automatiquement après confirmation du paiement.
export async function POST(req: Request) {
  const { user, profile } = await getSession();
  if (!user || !profile) return NextResponse.json({ error: "Connecte-toi d'abord." }, { status: 401 });
  const { plan, styleId, duration, conversationId, imageUrl, method = "mobile", topup } = (await req.json()) as {
    plan: Plan; styleId: string; duration: number; conversationId?: string; imageUrl?: string; method?: "mobile" | "card"; topup?: number;
  };
  if (method !== "mobile" && method !== "card") return NextResponse.json({ error: "Moyen de paiement invalide." }, { status: 400 });
  if (method === "card" && !stripeReady()) return NextResponse.json({ error: "Le paiement par carte arrive bientôt. Utilise Mobile Money pour l'instant." }, { status: 503 });
  const currency = currencyOf(profile.country);
  const isTopup = (plan as string) === "topup";
  let amount: number;
  let style: { id: string; name_fr: string } | null = null;
  const pricing = await loadPricing();
  if (isTopup) {
    // Recharge du portefeuille : montant libre, arrondi à 100.
    amount = Math.round(Number(topup) / 100) * 100;
    if (!Number.isFinite(amount) || amount < 1000 || amount > 1000000)
      return NextResponse.json({ error: "Montant entre 1 000 et 1 000 000 FCFA." }, { status: 400 });
  } else {
    const st = pricing.styles.find((s) => s.id === styleId);
    if (!st || !st.durations.includes(duration) || !["single", "pack5", "monthly"].includes(plan))
      return NextResponse.json({ error: "Offre invalide." }, { status: 400 });
    style = st;
    amount = planPrice(pricing, plan, st, duration, currency);
  }
  const depositId = crypto.randomUUID();
  const db = adminClient().database;

  let convId: string | null = null;
  if (!isTopup && plan === "single" && conversationId) {
    const { data } = await db.from("conversations").select("id").eq("id", conversationId).eq("user_id", user.id).limit(1);
    convId = data?.[0]?.id ?? null;
  }

  await db.from("payments").insert([{
    id: depositId, user_id: user.id, plan, style_id: style?.id ?? null, duration_s: isTopup ? null : duration,
    videos: isTopup ? 0 : planVideos(pricing, plan), amount, currency, phone: profile.phone,
    conversation_id: convId, image_url: convId ? imageUrl ?? null : null, method,
  }]);
  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/paiement?id=${depositId}`;
  try {
    if (method === "card") {
      const label = isTopup ? "Sokozia · Recharge du solde" : `Sokozia · ${plan === "single" ? "1 pub" : plan === "pack5" ? "Pack 5 pubs" : "Mensuel"} · ${style?.name_fr} ${duration} s`;
      const s = await createCheckout({ paymentId: depositId, amount, currency, label, email: (user as { email?: string }).email, returnUrl });
      await db.from("payments").update({ raw: { stripe_session: s.id } }).eq("id", depositId);
      return NextResponse.json({ url: s.url });
    }
    const url = await createPaymentPage({
      depositId, amount, currency,
      country: COUNTRIES[profile.country]?.iso3 ?? "CMR",
      phone: toMsisdn(profile.phone, COUNTRIES[profile.country]?.dial ?? "237"),
      returnUrl,
    });
    return NextResponse.json({ url });
  } catch (e) {
    await db.from("payments").update({ status: "failed", raw: { error: String(e) } }).eq("id", depositId);
    return NextResponse.json({ error: "Le paiement n'a pas pu démarrer. Réessaie." }, { status: 502 });
  }
}
