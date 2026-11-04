import { adminClient, getSession } from "@/lib/insforge";

// Téléchargement réel de la vidéo (le lien direct du stockage est sur un autre domaine : le navigateur
// ignore alors l'attribut download et ouvre la vidéo au lieu de l'enregistrer).
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, profile } = await getSession();
  if (!user) return new Response("Connecte-toi d'abord.", { status: 401 });
  const { id } = await params;
  let q = adminClient().database.from("videos").select("id, video_url, created_by").eq("id", id);
  if (!profile?.is_admin) q = q.eq("created_by", user.id);
  const { data } = await q.limit(1);
  const url = data?.[0]?.video_url as string | undefined;
  if (!url) return new Response("Vidéo introuvable.", { status: 404 });
  const file = await fetch(url, { redirect: "follow", cache: "no-store" });
  if (!file.ok || !file.body) return new Response("Vidéo indisponible pour le moment.", { status: 502 });
  const headers = new Headers({
    "Content-Type": "video/mp4",
    "Content-Disposition": `attachment; filename="sokozia-${id.slice(0, 8)}.mp4"`,
    "Cache-Control": "private, no-store",
  });
  const len = file.headers.get("content-length");
  if (len) headers.set("Content-Length", len);
  return new Response(file.body, { headers });
}
