import { NextResponse } from "next/server";
import { adminClient, getSession } from "@/lib/insforge";
import { createProject, loadProject, projectState } from "@/lib/project";
import type { Product } from "@/lib/director";

const str = (v: unknown, max = 600) => String(v ?? "").trim().slice(0, max);

// Étape 1 : le client remplit la fiche produit -> on lance la fiche produit (image).
export async function POST(req: Request) {
  const { user } = await getSession();
  if (!user) return NextResponse.json({ error: "Connecte-toi d'abord." }, { status: 401 });
  const b = await req.json();
  const product: Product & { worn: boolean } = {
    brand: str(b.brand, 80), name: str(b.name, 80), what: str(b.what), looks: str(b.looks), hidden: str(b.hidden),
    benefits: str(b.benefits), buyer: str(b.buyer), platform: str(b.platform, 40) || "TikTok",
    videoStyle: str(b.videoStyle, 60) || "propose", vibe: str(b.vibe), direction: str(b.direction), avoid: str(b.avoid),
    language: str(b.language, 60) || "français", worn: Boolean(b.worn),
    photos: (Array.isArray(b.photos) ? b.photos : []).filter((u: unknown) => typeof u === "string" && u.startsWith("https://")).slice(0, 6),
  };
  if (!product.brand || !product.name || !product.what || !product.benefits || !product.buyer)
    return NextResponse.json({ error: "Remplis au moins la marque, le produit, ce que c'est, ses points forts et qui l'achète." }, { status: 400 });
  if (!product.photos.length && !product.looks)
    return NextResponse.json({ error: "Ajoute des photos du produit ou décris son apparence." }, { status: 400 });
  // Limite anti-abus : chaque projet coûte des appels IA et des images.
  const since = new Date(Date.now() - 86400000).toISOString();
  const { data: recent } = await adminClient().database.from("conversations").select("id").eq("user_id", user.id).gt("created_at", since).limit(16);
  if ((recent?.length ?? 0) >= 15)
    return NextResponse.json({ error: "Tu as créé beaucoup de projets aujourd'hui. Reviens demain ou écris-nous." }, { status: 429 });
  try {
    const id = await createProject(user.id, product);
    return NextResponse.json(await projectState((await loadProject(user.id, id))!));
  } catch {
    return NextResponse.json({ error: "Awa est occupée, réessaie dans un instant." }, { status: 502 });
  }
}
