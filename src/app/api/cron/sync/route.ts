import { NextResponse } from "next/server";
import { adminClient } from "@/lib/insforge";
import { syncVideo, VIDEO_COLS } from "@/lib/videos";
import { settlePayment } from "@/lib/payments";

// Appelé chaque minute (planificateur InsForge) : finalise les pubs et les paiements
// même si le client a fermé la page ou si le rappel pawaPay n'est pas arrivé.
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({}, { status: 401 });
  const db = adminClient().database;
  const [{ data: videos }, { data: payments }] = await Promise.all([
    db.from("videos").select(VIDEO_COLS).in("status", ["pending", "processing"]).order("created_at").limit(20),
    db.from("payments").select("id").eq("status", "pending").lt("created_at", new Date(Date.now() - 60000).toISOString()).order("created_at").limit(20),
  ]);
  const v = await Promise.allSettled((videos ?? []).map(syncVideo));
  const p = await Promise.allSettled((payments ?? []).map((x: { id: string }) => settlePayment(x.id)));
  return NextResponse.json({ videos: v.length, payments: p.length });
}
