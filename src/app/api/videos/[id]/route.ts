import { NextResponse } from "next/server";
import { adminClient, getSession } from "@/lib/insforge";
import { syncVideo } from "@/lib/videos";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await getSession();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const { data } = await adminClient().database.from("videos")
    .select("id, created_by, status, apiframe_task_id, pass_id, video_url")
    .eq("id", id).eq("created_by", user.id).limit(1);
  const v = data?.[0];
  if (!v) return NextResponse.json({ error: "introuvable" }, { status: 404 });
  const synced = await syncVideo(v);
  return NextResponse.json({ status: synced.status, url: synced.video_url });
}
