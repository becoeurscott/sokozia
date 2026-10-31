import { NextResponse } from "next/server";
import { badRequest, readJson, route } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";
import { applyWallet } from "@/lib/services/wallet";

export const dynamic = "force-dynamic";

/** Most an admin can add in one go, in FCFA. */
const MAX_CREDIT = 500_000;

/** Admin: adds FCFA to a customer's balance (kind "credit" in the history). */
export const POST = route(async (req) => {
  const admin = await requireAdmin();
  const body = await readJson<{ userId?: string; amount?: number; note?: string }>(req);
  const userId = String(body.userId ?? "");
  const amount = Number(body.amount);
  if (!/^[0-9a-f-]{36}$/i.test(userId)) badRequest("Client invalide.");
  if (!Number.isInteger(amount) || amount <= 0 || amount > MAX_CREDIT) badRequest(`Montant entre 1 et ${MAX_CREDIT.toLocaleString("fr-FR")} FCFA.`);
  const note = String(body.note ?? "").trim().slice(0, 80);
  const result = await applyWallet({
    userId,
    amount,
    kind: "credit",
    label: note ? `Crédit offert · ${note}` : "Crédit offert par Sokozia",
  });
  console.info("[admin] credit", { by: admin.email, userId, amount });
  return NextResponse.json({ balance: result.balance });
});
