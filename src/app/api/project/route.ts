import { NextResponse } from "next/server";
import { adminClient, getSession } from "@/lib/insforge";
import { createProject, loadProject, projectState } from "@/lib/project";

// Premier message du chat : crée le projet, Awa commence à recueillir les infos du produit.
export async function POST(req: Request) {
  const { user } = await getSession();
  if (!user) return NextResponse.json({ error: "Connecte-toi d'abord." }, { status: 401 });
  const b = await req.json();
  const text = String(b.text ?? "").trim().slice(0, 1000);
  const photos = (Array.isArray(b.photos) ? b.photos : []).filter((u: unknown) => typeof u === "string" && u.startsWith("https://")).slice(0, 6);
  if (!text && !photos.length) return NextResponse.json({ error: "Écris un message ou envoie une photo." }, { status: 400 });

  // Limite anti-abus : chaque projet coûte des appels IA et des images.
  const since = new Date(Date.now() - 86400000).toISOString();
  const { data: recent } = await adminClient().database.from("conversations").select("id").eq("user_id", user.id).gt("created_at", since).limit(16);
  if ((recent?.length ?? 0) >= 15)
    return NextResponse.json({ error: "Tu as créé beaucoup de projets aujourd'hui. Reviens demain ou écris-nous." }, { status: 429 });
  try {
    const id = await createProject(user.id, text, photos);
    return NextResponse.json(await projectState((await loadProject(user.id, id))!));
  } catch {
    return NextResponse.json({ error: "Awa est occupée, réessaie dans un instant." }, { status: 502 });
  }
}
