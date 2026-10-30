import Link from "next/link";
import { ArrowRight, MessageCircle, Users, Clapperboard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ACTORS } from "@/lib/actors";
import { formatFcfa, lowestPrice } from "@/lib/models";
import { PriceTable } from "@/components/marketing/PriceTable";
import { CreatorCard } from "@/components/studio/ActorsPicker";

export default function LandingPage() {
  return (
    <main>
      {/* Hero: the Seedance clip fills the screen, little text, one card to start. */}
      <section className="relative isolate flex min-h-[calc(100svh-4rem)] items-end overflow-hidden text-white md:items-center">
        <video
          className="absolute inset-0 -z-20 h-full w-full object-cover motion-reduce:hidden"
          src="/hero/hero.mp4"
          poster="/hero/hero.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#1d1a16]/70 via-[#1d1a16]/45 to-[#1d1a16]/85 md:bg-gradient-to-r md:from-[#1d1a16]/80 md:via-[#1d1a16]/50 md:to-transparent" />
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 pb-10 pt-16 md:grid-cols-[1fr_380px] md:items-center md:py-24">
          <div>
            <h1 className="text-[2.6rem] font-extrabold leading-[1.05] tracking-tight md:text-6xl">
              Ta pub vidéo avec des <span className="text-brand">visages africains</span>
            </h1>
            <p className="mt-4 max-w-md text-lg text-white/85">Décris ton produit. L&apos;IA écrit et tourne ta pub TikTok en quelques minutes.</p>
          </div>
          <div className="rounded-3xl bg-bg p-6 text-center text-ink shadow-[0_30px_80px_-30px_rgba(0,0,0,.6)]">
            <div className="text-xl font-extrabold text-brand">Crée ta première pub</div>
            <div className="mt-1 text-sm text-muted">
              Dès <b className="text-ink">{formatFcfa(lowestPrice())}</b> · sans abonnement
            </div>
            <Button href="/studio" size="lg" className="mt-5 w-full">
              Créer ma vidéo <ArrowRight className="h-4 w-4" />
            </Button>
            <Button href="/tarifs" size="lg" variant="outline" className="mt-3 w-full">
              Voir les prix
            </Button>
            <div className="mt-4 text-xs text-muted">Orange Money · MTN MoMo · Wave · Carte</div>
          </div>
        </div>
      </section>

      {/* Studio preview */}
      <section className="welcome-glow">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <div className="overflow-hidden rounded-3xl border border-line bg-card shadow-[0_30px_80px_-40px_rgba(29,26,22,.4)]">
            <div className="flex">
              <div className="hidden w-48 shrink-0 border-r border-line bg-side p-4 text-sm sm:block">
                <div className="mb-4 font-extrabold">
                  Soko<span className="text-brand">zia</span>
                </div>
                <div className="rounded-lg bg-hover px-2 py-1.5 font-semibold">Nouvel agent</div>
                <div className="px-2 py-1.5 text-ink/70">Bibliothèque</div>
                <div className="px-2 py-1.5 text-ink/70">Modèles</div>
                <div className="px-2 py-1.5 text-ink/70">Docs</div>
              </div>
              <div className="flex-1 p-6 md:p-10">
                <div className="mb-5 text-center font-serif text-2xl md:text-3xl">Pour quel produit on fait une pub&nbsp;?</div>
                <div className="rounded-2xl border border-line bg-bg p-4">
                  <div className="text-muted">Mes perruques, -20 % ce week-end, à Douala</div>
                  <div className="mt-6 flex justify-end">
                    <span className="rounded-pill bg-brand px-4 py-2 text-sm font-semibold text-white">Créer la vidéo ↑</span>
                  </div>
                </div>
                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-line bg-card p-4 text-left text-sm">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand font-bold text-white">A</span>
                  <div>
                    <div className="font-semibold">Awa · Directrice de création</div>
                    <div className="text-muted">Top ! Nneka dans un salon de coiffure, 15 s : « Les filles, -20 % sur toutes mes perruques ce week-end ! »</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-line bg-card">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 text-center md:grid-cols-4">
          {[
            ["15 ou 30 s", "de vraies pubs"],
            ["9:16", "format TikTok / Reels"],
            ["0", "acteur à payer"],
            ["0 FCFA", "si la pub échoue"],
          ].map(([v, l]) => (
            <div key={l}>
              <div className="text-3xl font-extrabold text-brand">{v}</div>
              <div className="text-sm text-muted">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">Comment ça marche</div>
        <h2 className="mt-2 text-3xl font-extrabold md:text-4xl">Comme parler à un réalisateur, sur WhatsApp</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            [MessageCircle, "Parle de ton produit", "Décris-le, colle un lien, envoie tes photos. Awa prépare le brief en quelques secondes."],
            [Users, "Choisis ton créateur et le lieu", "36 créateurs africains. Boutique, marché, salon… le créateur garde le même visage dans toutes tes pubs."],
            [Clapperboard, "Valide le script et crée", "15 ou 30 secondes, tournée avec Seedance 2.0. Le prix s'affiche avant de payer, la vidéo apparaît dans la conversation."],
          ].map(([Icon, t, d], i) => {
            const I = Icon as typeof MessageCircle;
            return (
              <div key={t as string} className="rounded-2xl border border-line bg-card p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-brand">
                    <I className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-bold text-muted">0{i + 1}</span>
                </div>
                <h3 className="mt-4 text-lg font-bold">{t as string}</h3>
                <p className="mt-1 text-sm text-muted">{d as string}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Creators */}
      <section className="bg-card py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-brand">Nos créateurs</div>
          <h2 className="mt-2 text-3xl font-extrabold md:text-4xl">16 visages africains pour présenter ton produit</h2>
          <p className="mt-2 max-w-xl text-muted">Écoute-les se présenter, puis choisis la personne qui parle à tes clients. Son visage reste le même dans toutes tes pubs.</p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {ACTORS.map((a) => (
              <CreatorCard key={a.id} actor={a} />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Button href="/studio" size="lg">
              Choisir mon créateur
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl font-extrabold md:text-4xl">Deux formats, un prix fixe</h2>
        <p className="mt-2 max-w-2xl text-muted">Claude écrit le script comme une directrice de création, Seedance 2.0 tourne la vidéo. Tu choisis 15 ou 30 secondes et tu payes la vidéo, c&apos;est tout.</p>
        <div className="mt-8">
          <PriceTable />
        </div>
        <div className="mt-6">
          <Link href="/tarifs" className="font-semibold text-brand hover:underline">
            Tous les détails →
          </Link>
        </div>
      </section>

      {/* Why */}
      <section className="bg-card py-16">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-3xl font-extrabold md:text-4xl">Pourquoi Sokozia ?</h2>
          <div className="mt-6 overflow-hidden rounded-2xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-bg text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="p-3"></th>
                  <th className="p-3">Tournage classique</th>
                  <th className="p-3 text-brand">Sokozia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[
                  ["Prix d'une vidéo", "50 000 – 200 000 FCFA", `dès ${formatFcfa(lowestPrice())}`],
                  ["Délai", "1 à 2 semaines", "Quelques minutes"],
                  ["Acteur, matériel, lieu", "À trouver et payer", "Inclus"],
                  ["Changer le message", "Tout refaire", "Une phrase à Awa"],
                ].map(([k, a, b]) => (
                  <tr key={k}>
                    <td className="p-3 font-semibold">{k}</td>
                    <td className="p-3 text-muted">{a}</td>
                    <td className="p-3 font-semibold text-accent">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-accent" />
        <h2 className="mt-3 text-3xl font-extrabold md:text-4xl">Ta première pub en quelques minutes</h2>
        <p className="mt-2 text-muted">Inscription gratuite. Tu payes chaque vidéo par Mobile Money, rien d&apos;autre.</p>
        <Button href="/studio" size="lg" className="mt-6">
          Commencer maintenant <ArrowRight className="h-4 w-4" />
        </Button>
      </section>
    </main>
  );
}
