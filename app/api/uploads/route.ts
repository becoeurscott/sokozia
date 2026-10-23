import { NextResponse, type NextRequest } from "next/server";
import { badRequest, requireUser, route } from "@/lib/api";
import { getDb, now } from "@/lib/db";
import type { Upload } from "@/lib/types";
import { newKey, putFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/quicktime", "video/webm", "audio/mpeg", "audio/wav", "audio/x-m4a", "audio/aac"];
const MAX_BYTES = 25 * 1024 * 1024;

export const POST = route(async (req: NextRequest) => {
  const user = await requireUser();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) badRequest("Aucun fichier.");
  if (!ALLOWED.includes(file.type)) badRequest("Format non pris en charge (jpg, png, webp, mp4, mov, mp3…).");
  if (file.size > MAX_BYTES) badRequest("Fichier trop lourd (25 Mo max).");

  const key = newKey(user.id, file.type);
  const url = await putFile("uploads", key, await file.arrayBuffer(), file.type);
  const db = await getDb();
  const kind = file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "image";
  const upload = await db.insert<Upload>("uploads", { user_id: user.id, url, kind, name: file.name, created_at: now() });
  return NextResponse.json({ upload });
});
