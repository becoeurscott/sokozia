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
  const { plan, styleId, duration, conversationId, imageUrl, method = "mobile" } = (await req.json()) as {
    plan: Plan; styleId: string; duration: number; conversationId?: string; imageUrl?: string; method?: "mobile" | "card";
  };
  if (method !== "mobile" && method !== "card") return NextResponse.json({ error: "Moyen de paiement invalide." }, { status: 400 });
  if (method === "card" && !stripeReady()) return NextResponse.json({ error: "Le paiement par carte arrive bientôt. Utilise Mobile Money pour l'instant." }, { status: 503 });
  const pricing = await loadPricing();
  const style = pricing.styles.find((s) => s.id === styleId);
  if (!style || !style.durations.includes(duration) || !["single", "pack5", "monthly"].includes(plan))
    return NextResponse.json({ error: "Offre invalide." }, { status: 400 });

  const currency = currencyOf(profile.country);
  const amount = planPrice(pricing, plan, style, duration, currency);
  const depositId = crypto.randomUUID();
  const db = adminClient().database;

  let convId: string | null = null;
  if (plan === "single" && conversationId) {
    const { data } = await db.from("conversations").select("id").eq("id", conversationId).eq("user_id", user.id).limit(1);
    convId = data?.[0]?.id ?? null;
  }

  await db.from("payments").insert([{
    id: depositId, user_id: user.id, plan, style_id: style.id, duration_s: duration,
    videos: planVideos(pricing, plan), amount, currency, phone: profile.phone,
    conversation_id: convId, image_url: convId ? imageUrl ?? null : null, method,
  }]);
  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/paiement?id=${depositId}`;
  try {
    if (method === "card") {
      const label = `Sokozia · ${plan === "single" ? "1 pub" : plan === "pack5" ? "Pack 5 pubs" : "Mensuel"} · ${style.name_fr} ${duration} s`;
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
