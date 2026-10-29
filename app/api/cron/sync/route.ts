import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import type { Generation, Order } from "@/lib/types";
import { syncOrder } from "@/lib/services/orders";
import { syncGeneration } from "@/lib/services/generations";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Called every minute by the InsForge schedule "Sync videos" (set up for
 * the earlier app, same URL and CRON_SECRET). Settles pending pawaPay and
 * card payments and moves running videos forward, so a customer who
 * closes the page still gets their video.
 */
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({}, { status: 401 });
  }
  const db = await getDb();
  const [pendingOrders, queued, running] = await Promise.all([
    db.list<Order>("orders", { status: "pending" }, { orderBy: "created_at", ascending: false, limit: 30 }),
    db.list<Generation>("generations", { status: "queued" }, { orderBy: "created_at", ascending: false, limit: 20 }),
    db.list<Generation>("generations", { status: "in_progress" }, { orderBy: "created_at", ascending: false, limit: 20 }),
  ]);
  const cutoff = Date.now() - 60_000;
  // Real providers only; test-mode orders are left alone. Give the return page a minute first.
  const orders = pendingOrders.filter((o) => o.provider !== "mock" && Date.parse(o.created_at) < cutoff);
  const gens = [...queued, ...running].filter((g) => g.provider !== "mock");
  const o = await Promise.allSettled(orders.map(syncOrder));
  const g = await Promise.allSettled(gens.map(syncGeneration));
  return NextResponse.json({
    payments: o.length,
    videos: g.length,
    errors: [...o, ...g].filter((r) => r.status === "rejected").length,
  });
}
