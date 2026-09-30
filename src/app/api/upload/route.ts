import { NextResponse } from "next/server";
import { adminClient, getSession } from "@/lib/insforge";

// Photo produit optionnelle (sert d'image de départ pour la vidéo).
export async function POST(req: Request) {
  const { user } = await getSession();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const file = (await req.formData()).get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/") || file.size > 8 * 1024 * 1024)
    return NextResponse.json({ error: "Image invalide (8 Mo max)." }, { status: 400 });
  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const { data, error } = await adminClient().storage.from("videos").upload(`uploads/${user.id}/${crypto.randomUUID()}.${ext}`, file);
  if (error || !data) return NextResponse.json({ error: "Envoi impossible." }, { status: 502 });
  return NextResponse.json({ url: data.url });
}
