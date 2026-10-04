import { NextResponse } from "next/server";
import { adminClient, getSession } from "@/lib/insforge";
import { settlePayment } from "@/lib/payments";

// Raisons de refus pawaPay traduites pour le client.
const REASONS: Record<string, string> = {
  INSUFFICIENT_BALANCE: "Solde insuffisant sur ton compte Mobile Money.",
  PAYER_NOT_FOUND: "Ce numéro n'a pas de compte Mobile Money actif chez cet opérateur.",
  PAYER_LIMIT_REACHED: "Tu as atteint la limite de paiement de ton compte Mobile Money.",
  PAYMENT_NOT_APPROVED: "Le paiement n'a pas été validé sur ton téléphone (code non saisi ou annulé).",
  INVALID_PHONE_NUMBER: "Numéro de téléphone invalide.",
  WALLET_LIMIT_REACHED: "Ton compte Mobile Money a atteint sa limite.",
  UNSPECIFIED_FAILURE: "L'opérateur a refusé le paiement. Réessaie dans quelques minutes.",
};

export async function GET(req: Request) {
  const { user } = await getSession();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const db = adminClient().database;
  const { data } = await db.from("payments").select("id").eq("id", id).eq("user_id", user.id).limit(1);
  if (!data?.length) return NextResponse.json({ status: "unknown" }, { status: 404 });
  const status = await settlePayment(id);
  let reason: string | undefined;
  if (status === "failed") {
    const { data: rows } = await db.from("payments").select("raw").eq("id", id).limit(1);
    const raw = rows?.[0]?.raw as { expired?: boolean; data?: { failureReason?: { failureCode?: string } } } | null;
    const code = raw?.data?.failureReason?.failureCode;
    reason = raw?.expired ? "La page de paiement a expiré sans être validée." : (code && REASONS[code]) || REASONS.UNSPECIFIED_FAILURE;
  }
  return NextResponse.json({ status, reason });
}
