import { NextResponse } from "next/server";
import { adminClient } from "@/lib/insforge";
import { syncVideo } from "@/lib/videos";

// Appelé périodiquement (planificateur InsForge) pour finaliser les vidéos même si l'utilisateur a fermé la page.
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({}, { status: 401 });
  const { data } = await adminClient().database.from("videos")
    .select("id, created_by, status, apiframe_task_id, pass_id, video_url")
    .eq("status", "processing").order("created_at").limit(20);
  const results = await Promise.allSettled((data ?? []).map(syncVideo));
  return NextResponse.json({ checked: results.length });
}
