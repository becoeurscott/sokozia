import { NextResponse } from "next/server";
import { adminClient, getSession } from "@/lib/insforge";
import { syncVideo, VIDEO_COLS } from "@/lib/videos";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await getSession();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const { data } = await adminClient().database.from("videos")
    .select(VIDEO_COLS)
    .eq("id", id).eq("created_by", user.id).limit(1);
  const v = data?.[0];
  if (!v) return NextResponse.json({ error: "introuvable" }, { status: 404 });
  const synced = await syncVideo(v);
  return NextResponse.json({ status: synced.status === "pending" ? "processing" : synced.status, url: synced.video_url });
}
