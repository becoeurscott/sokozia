import { NextResponse, type NextRequest } from "next/server";
import { notFound, params, requireUser, route } from "@/lib/api";
import { getDb } from "@/lib/db";
import type { Generation } from "@/lib/types";
import { publicGeneration, syncGeneration } from "@/lib/services/generations";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req: NextRequest, ctx) => {
  const user = await requireUser();
  const { id } = await params(ctx);
  const db = await getDb();
  const g = await db.get<Generation>("generations", id);
  if (!g || g.user_id !== user.id) notFound("Vidéo introuvable.");
  const synced = await syncGeneration(g);
  return NextResponse.json({ generation: publicGeneration(synced) });
});
