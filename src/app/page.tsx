import Link from "next/link";
import { Building2, Clapperboard, Crown, PartyPopper, Shirt, Smartphone, Sparkles, UtensilsCrossed, Video, Zap } from "lucide-react";
import { fmt, loadPricing, videoPrice } from "@/lib/pricing";
import Showcase from "@/components/Showcase";
import Testimonials from "@/components/Testimonials";
import CreatorsSection from "@/components/CreatorsSection";

const uses = [
  [Shirt, "Mode & perruques", "Une cliente montre le rendu et donne son avis."],
  [UtensilsCrossed, "Restaurants", "Un client goûte ton plat et le recommande."],
  [Sparkles, "Cosmétiques", "Avant / après, routine beauté, témoignage."],
  [Smartphone, "Électronique", "Déballage du téléphone face caméra."],
  [Building2, "Immobilier", "Visite rapide d'un appartement à louer."],
  [PartyPopper, "Événements", "Annonce de ton concert, salon ou promo."],
] as const;

const styleIcons = [Zap, Video, Clapperboard, Crown];

const faq = [
  ["Je dois savoir faire des vidéos ?", "Non. Tu réponds à quelques questions simples, Awa écrit le script et on crée la vidéo."],
  ["Comment je paye ?", "Par Mobile Money : Orange Money, MTN MoMo, Moov, Airtel, M-Pesa. Paiement sécurisé par pawaPay."],
  ["Combien de temps ça prend ?", "Entre 5 et 15 minutes selon la durée et le style."],
  ["Et si la vidéo ne marche pas ?", "Ta pub n'est pas décomptée : tu peux la relancer gratuitement."],
  ["Je peux l'utiliser pour mes pubs ?", "Oui, sur TikTok, Facebook, Instagram, WhatsApp et ton site. Les vidéos restent la propriété de Sokozia (voir conditions)."],
];

export default async function Home() {
  const pricing = await loadPricing();
  const from = Math.min(...pricing.styles.map((s) => videoPrice(pricing, "monthly", s, s.durations[0], "XAF")));
  return (
    <div className="overflow-x-hidden">
      {/* Hero */}
      <section className="relative">
        <div className="absolute -right-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-brand/15 blur-3xl" />
        <div className="absolute -left-40 top-60 h-[24rem] w-[24rem] rounded-full bg-accent/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-10 sm:pt-16 text-center">
          <div>
            <p className="mx-auto w-fit rounded-full border border-line bg-card px-4 py-1.5 text-sm font-semibold">
              <span className="sm:hidden">Paiement Mobile Money</span><span className="hidden sm:inline">Orange Money · MTN MoMo · Moov · Airtel · M-Pesa</span>
            </p>
            <h1 className="mt-5 mx-auto max-w-4xl text-[2rem] font-extrabold leading-[1.1] tracking-tight sm:text-6xl sm:leading-[1.05]">
              Tes vidéos pub avec des <span className="relative whitespace-nowrap text-brand">visages africains<svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 10" preserveAspectRatio="none"><path d="M2 7 Q100 0 198 6" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" /></svg></span>, prêtes en quelques minutes.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
              Pas d&apos;acteur, pas de caméra, pas de montage. Tu décris ton produit, notre directrice de création IA écrit le script et on crée la vidéo pour TikTok, WhatsApp et Facebook.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/inscription" className="btn text-lg">Créer ma vidéo →</Link>
              <Link href="/tarifs" className="btn-ghost">Voir les prix</Link>
            </div>
            <p className="mt-4 text-sm text-muted">À partir de <b className="text-ink">{fmt(from, "XAF")}</b> la vidéo · Inscription gratuite</p>
          </div>
        </div>
      </section>

      <section className="pb-16"><Showcase /></section>

      {/* Chiffres */}
      <section className="border-y border-line bg-card">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 text-center sm:grid-cols-4">
          {[["8–30 s", "de vraies pubs"], ["9:16", "format TikTok / Reels"], ["0", "acteur à payer"], ["0 FCFA", "si la pub échoue"]].map(([a, b]) => (
            <div key={b}><p className="text-3xl font-extrabold text-brand">{a}</p><p className="text-sm text-muted">{b}</p></div>
          ))}
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <p className="text-center text-sm font-bold uppercase tracking-widest text-brand">Comment ça marche</p>
        <h2 className="mt-2 text-center text-3xl font-extrabold sm:text-4xl">Comme parler à un réalisateur, sur WhatsApp</h2>
        <div className="mt-12 grid items-center gap-10 lg:grid-cols-2">
          <ol className="space-y-6">
            {[
              ["Parle de ton produit", "Awa te pose quelques questions dans le chat. Envoie aussi tes photos : elle crée la fiche de ton produit."],
              ["Choisis ton créateur et le lieu", "16 créateurs africains, écoute leur présentation. Puis choisis où tourner : boutique, marché, salon…"],
              ["Valide le script et crée", "8, 15 ou 30 secondes. Choisis le style, le prix s'affiche avant de payer."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-lg font-bold text-white">{i + 1}</span>
                <div><p className="text-lg font-bold">{t}</p><p className="text-muted">{d}</p></div>
              </li>
            ))}
          </ol>
          <div className="rounded-3xl border border-line bg-card p-5 shadow-lg">
            <div className="mb-4 flex items-center gap-3 border-b border-line pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand font-bold text-white">A</div>
              <div><p className="font-bold">Awa</p><p className="text-xs text-accent">Directrice de création · en ligne</p></div>
            </div>
            <div className="space-y-2 text-sm">
              <p className="w-fit max-w-[85%] rounded-2xl border border-line px-4 py-2">Salut Qu&apos;est-ce que tu veux mettre en avant ?</p>
              <p className="ml-auto w-fit max-w-[85%] rounded-2xl bg-brand px-4 py-2 text-white">Mes perruques, -20 % ce week-end</p>
              <p className="w-fit max-w-[85%] rounded-2xl border border-line px-4 py-2">Top ! Tu vends surtout à qui ? Jeunes femmes, mamans, professionnelles… ?</p>
              <p className="ml-auto w-fit max-w-[85%] rounded-2xl bg-brand px-4 py-2 text-white">Femmes 25–40 ans à Douala</p>
              <div className="rounded-2xl bg-bg p-3">
                <p className="text-xs font-bold uppercase text-accent">Script prêt</p>
                <p className="mt-1">Une femme dans un salon de coiffure : « Les filles, -20 % sur toutes mes perruques ce week-end ! »</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CreatorsSection />

      {/* Pour qui */}
      <section className="bg-ink py-20 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-extrabold sm:text-4xl">Pour tous les commerces</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {uses.map(([Icon, t, d]) => (
              <div key={t} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/20 text-brand"><Icon size={22} strokeWidth={1.8} /></span><p className="mt-2 text-lg font-bold">{t}</p><p className="text-white/70">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Styles */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-3xl font-extrabold sm:text-4xl">4 styles, selon ton budget</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pricing.styles.map((s, i) => (
            <div key={s.id} className={`card flex flex-col ${i === 1 ? "!border-brand" : ""}`}>
              {(() => { const Icon = styleIcons[i] ?? Video; return <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand"><Icon size={22} strokeWidth={1.8} /></span>; })()}
              <h3 className="mt-2 text-lg font-bold">{s.name_fr}</h3>
              <p className="mt-1 flex-1 text-sm text-muted">{s.description_fr}</p>
              <p className="mt-4 text-xs text-muted">dès</p>
              <p className="text-2xl font-extrabold">{fmt(videoPrice(pricing, "monthly", s, s.durations[0], "XAF"), "XAF")}</p>
              <p className="text-xs text-muted">par pub de {s.durations.join(" ou ")} s</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center"><Link href="/tarifs" className="font-semibold text-brand underline">Voir tous les prix →</Link></p>
      </section>

      {/* Comparatif */}
      <section className="mx-auto max-w-4xl px-4 pb-20">
        <h2 className="text-center text-3xl font-extrabold sm:text-4xl">Pourquoi Sokozia ?</h2>
        <div className="mt-8 overflow-hidden rounded-3xl border border-line bg-card text-sm sm:text-base">
          {[
            ["", "Tournage classique", "Sokozia"],
            ["Prix d'une vidéo", "50 000 – 200 000 FCFA", `dès ${fmt(from, "XAF")}`],
            ["Délai", "1 à 2 semaines", "Quelques minutes"],
            ["Acteur, matériel, lieu", "À trouver et payer", "Inclus"],
            ["Changer le message", "Tout refaire", "Une phrase à Awa"],
          ].map((r, i) => (
            <div key={i} className={`grid grid-cols-3 gap-2 px-4 py-3 ${i === 0 ? "bg-bg font-bold" : "border-t border-line"}`}>
              <p className="font-semibold">{r[0]}</p><p className="text-muted">{r[1]}</p><p className="font-semibold text-accent">{r[2]}</p>
            </div>
          ))}
        </div>
      </section>

      <Testimonials />

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-20">
        <h2 className="mb-6 text-center text-3xl font-extrabold">Questions fréquentes</h2>
        <div className="space-y-3">
          {faq.map(([q, a]) => (
            <details key={q} className="card group">
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">{q}<span className="text-brand transition group-open:rotate-45">+</span></summary>
              <p className="mt-2 text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-5xl rounded-[2rem] bg-brand px-6 py-14 text-center text-white">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Ta première pub en quelques minutes</h2>
          <p className="mt-3 text-white/85">Inscription gratuite. Tu payes seulement ce que tu crées.</p>
          <Link href="/inscription" className="mt-8 inline-flex rounded-full bg-white px-8 py-4 text-lg font-bold text-brand shadow-lg">Commencer maintenant</Link>
        </div>
      </section>
    </div>
  );
}
