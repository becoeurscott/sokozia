import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Clapperboard, Globe2, ImageIcon, Languages, RotateCcw, Smartphone, Sparkles, Users } from "lucide-react";
import { adminClient, getSession } from "@/lib/insforge";
import { getWallet } from "@/lib/wallet";
import { currencyOf } from "@/lib/pricing";
import { TopupButton } from "@/components/render/TopupButton";
import { CREATORS, creatorFiles } from "@/content/creators";

export const metadata = { title: "Tableau de bord — Sokozia" };

const FEATURES = [
  { icon: Users, title: `${CREATORS.length} créateurs africains`, text: "Choisis le visage qui parle à tes clients. Il reste le même dans toutes tes pubs." },
  { icon: ImageIcon, title: "Fiche produit en 8 vues", text: "Envoie tes photos : Awa reconstruit ton produit sous tous les angles." },
  { icon: Globe2, title: "Lieux d'ici", text: "Marché, boutique, salon, maquis… tournés comme avec un téléphone." },
  { icon: Languages, title: "Script dans ta langue", text: "Français, anglais, expressions locales ou pidgin." },
  { icon: Clapperboard, title: "Pubs de 8 à 30 secondes", text: "Format vertical prêt pour TikTok, Reels, WhatsApp et Facebook." },
  { icon: Smartphone, title: "Paiement Mobile Money", text: "MTN, Orange, Moov, Airtel, M-Pesa. Pub par pub ou en pack." },
  { icon: RotateCcw, title: "Échec = non décompté", text: "Si une pub ne se crée pas, elle t'est rendue automatiquement." },
];

export default async function Page() {
  const { profile } = await getSession();
  if (!profile) redirect("/connexion?next=/tableau-de-bord");
  const db = adminClient().database;
  // Nouveau compte sans aucun achat : onboarding (formule + paiement) avant le tableau de bord.
  if (!profile.is_admin && !(await cookies()).get("sz_onboarded")) {
    const [{ data: anyPass }, { data: anyPay }] = await Promise.all([
      db.from("wallet_tx").select("id").eq("user_id", profile.id).limit(1),
      db.from("payments").select("id").eq("user_id", profile.id).limit(1),
    ]);
    if (!anyPass?.length && !anyPay?.length) redirect("/bienvenue");
  }
  const [{ data: convs }, { data: videos }, wallet] = await Promise.all([
    db.from("conversations").select("id, title, step, created_at").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(30),
    db.from("videos").select("id, status, video_url, created_at").eq("created_by", profile.id).order("created_at", { ascending: false }).limit(12),
    getWallet(profile.id),
  ]);
  const c = currencyOf(profile.country);
  const cur = c === "XOF" || c === "XAF" ? "FCFA" : c;
  const ready = (videos ?? []).filter((v) => v.status === "ready");
  const first = profile.full_name.split(" ")[0];

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      {/* Bannière */}
      <section className="relative overflow-hidden rounded-[2rem] bg-ink p-6 text-white sm:p-10">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand/40 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-accent/30 blur-3xl" />
        <div className="relative grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-sm font-semibold text-white/60">Tableau de bord</p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight sm:text-5xl">Bonjour{first ? ` ${first}` : ""}, on crée ta prochaine pub ?</h1>
            <p className="mt-3 max-w-lg text-white/70">Ajoute la photo de ton produit, décris la vidéo, choisis le modèle et la durée : ta pub est prête en quelques minutes.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/studio" className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3.5 text-lg font-bold text-white shadow-lg hover:brightness-110">
                <Sparkles size={18} /> Créer une pub
              </Link>
              <Link href="/mes-videos" className="inline-flex items-center rounded-full border border-white/20 px-6 py-3.5 font-semibold text-white hover:bg-white/10">Mes vidéos</Link>
              <Link href="/compte" className="inline-flex items-center rounded-full border border-white/20 px-6 py-3.5 font-semibold text-white hover:bg-white/10">Mon compte</Link>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="grid grid-cols-4 gap-2">
              {CREATORS.slice(0, 8).map((c, i) => (
                <img key={c.id} src={creatorFiles(c.id).portrait} alt={c.name}
                  className={`aspect-[3/4] w-full rounded-2xl object-cover ring-2 ring-white/10 ${i % 2 ? "translate-y-4" : ""}`} />
              ))}
            </div>
          </div>
        </div>
        <div className="relative mt-8 grid grid-cols-3 gap-3 border-t border-white/10 pt-6 text-center sm:max-w-md">
          <div><p className="text-2xl font-extrabold">{videos?.length ?? 0}</p><p className="text-xs text-white/60">vidéos</p></div>
          <div><p className="text-2xl font-extrabold">{ready.length}</p><p className="text-xs text-white/60">pubs prêtes</p></div>
          <div><p className="text-2xl font-extrabold">{wallet.balance.toLocaleString("fr-FR")}</p><p className="text-xs text-white/60">{cur} de solde</p></div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        {/* Portefeuille */}
        <section className="rounded-3xl border border-line bg-card p-5">
          <h2 className="text-lg font-bold">Mon solde</h2>
          <p className="mt-2 text-4xl font-extrabold">{wallet.balance.toLocaleString("fr-FR")} <span className="text-lg text-muted">{cur}</span></p>
          <p className="mt-2 text-sm text-muted">Chaque vidéo est débitée selon le modèle et sa durée. Pas d&apos;abonnement, le solde n&apos;expire pas.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <TopupButton currency={cur} />
            <Link href="/portefeuille" className="btn-ghost">Historique</Link>
          </div>
        </section>

        <div className="space-y-8">
          {/* Dernières vidéos */}
          <section className="rounded-3xl border border-line bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Dernières pubs</h2>
              <Link href="/mes-videos" className="text-sm font-semibold text-brand">Tout voir</Link>
            </div>
            {ready.length ? (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {ready.slice(0, 6).map((v) => (
                  <a key={v.id} href={v.video_url!} target="_blank" className="overflow-hidden rounded-xl bg-ink">
                    <video src={v.video_url!} muted playsInline preload="metadata" className="aspect-[9/16] w-full object-cover" />
                  </a>
                ))}
              </div>
            ) : <p className="mt-2 text-sm text-muted">Tes pubs terminées apparaîtront ici.</p>}
          </section>
        </div>
      </div>

      {/* Fonctionnalités */}
      <section>
        <h2 className="mb-4 text-lg font-bold">Tout ce que Sokozia fait pour toi</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-line bg-card p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand"><Icon size={20} strokeWidth={1.8} /></span>
              <p className="mt-3 font-bold">{title}</p>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </div>
          ))}
          <Link href="/studio" className="flex flex-col justify-between rounded-2xl bg-brand p-5 text-white">
            <Sparkles size={22} />
            <p className="mt-6 text-lg font-bold">Commencer une nouvelle pub →</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
