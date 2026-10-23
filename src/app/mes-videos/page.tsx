import Link from "next/link";
import { redirect } from "next/navigation";
import { adminClient, getSession } from "@/lib/insforge";

const LABEL: Record<string, string> = { pending: "En attente", processing: "En création…", ready: "Prête", failed: "Échouée · remboursée" };

export default async function Page() {
  const { user } = await getSession();
  if (!user) redirect("/connexion?next=/mes-videos");
  const { data } = await adminClient().database.from("videos")
    .select("id, status, video_url, created_at, style_id, prompt, aspect_ratio, conversations(title)")
    .eq("created_by", user.id).order("created_at", { ascending: false }).limit(50);
  const videos = (data ?? []) as unknown as { id: string; status: string; video_url: string | null; created_at: string; prompt: string | null; aspect_ratio: string | null; conversations: { title: string } | null }[];
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold">Mes vidéos</h1>
        <Link href="/studio" className="btn">Nouvelle vidéo</Link>
      </div>
      {videos.length === 0 && <p className="card text-center text-muted">Aucune vidéo pour l&apos;instant.</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((v) => (
          <div key={v.id} className="card">
            {v.video_url ? <video src={v.video_url} controls playsInline preload="metadata" className={`${v.aspect_ratio === "16:9" ? "aspect-video" : v.aspect_ratio === "1:1" ? "aspect-square" : "aspect-[9/16]"} w-full rounded-xl bg-black object-contain`} />
              : <div className="flex aspect-[9/16] items-center justify-center rounded-xl bg-line/50 text-muted">{LABEL[v.status]}</div>}
            <p className="mt-3 line-clamp-2 font-semibold">{v.conversations?.title ?? v.prompt ?? "Vidéo"}</p>
            <p className="text-sm text-muted">{new Date(v.created_at).toLocaleDateString("fr-FR")} · {LABEL[v.status]}</p>
            {v.video_url && <a href={v.video_url} download className="mt-2 inline-block text-sm font-semibold text-brand underline">Télécharger</a>}
          </div>
        ))}
      </div>
    </div>
  );
}
