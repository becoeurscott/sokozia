import { NextResponse, type NextRequest } from "next/server";
import { badRequest, readJson, requireUser, route } from "@/lib/api";
import { createTopupOrder } from "@/lib/services/orders";
import { isTopupUnits } from "@/lib/wallet";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Opens a Mobile Money or card checkout that adds a pack to the wallet. */
export const POST = route(async (req: NextRequest) => {
  const user = await requireUser();
  const body = await readJson<{ units?: number; country?: string; method?: string }>(req);
  if (!isTopupUnits(body.units)) badRequest("Choisis une recharge : 2, 5 ou 10 vidéos.");
  const { order, redirectUrl } = await createTopupOrder({ user, units: body.units, country: body.country, method: body.method === "card" ? "card" : "mobile" });
  return NextResponse.json({ orderId: order.id, redirectUrl });
});
