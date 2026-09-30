import { testimonials } from "@/content/testimonials";

export default function Testimonials() {
  if (!testimonials.length) return null;
  const cards = testimonials.map((t) => (
    <figure key={t.name + t.quote} className="mx-3 w-80 shrink-0 rounded-3xl border border-line bg-card p-6">
      <blockquote className="text-ink">&ldquo;{t.quote}&rdquo;</blockquote>
      <figcaption className="mt-5 flex items-center gap-3">
        {t.photo ? <img src={t.photo} alt={t.name} className="h-10 w-10 rounded-full object-cover" />
          : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand font-bold text-white">{t.name[0]}</span>}
        <span className="text-sm"><b className="block">{t.name}</b><span className="text-muted">{t.business} · {t.city}</span></span>
      </figcaption>
    </figure>
  ));
  return (
    <section className="py-20">
      <p className="text-center text-sm font-bold uppercase tracking-widest text-brand">Ils utilisent Sokozia</p>
      <h2 className="mb-10 mt-2 text-center text-3xl font-extrabold sm:text-4xl">Ce que disent nos clients</h2>
      <div className="marquee-wrap overflow-hidden">
        <div className="marquee marquee-reverse" style={{ ["--speed" as string]: "60s" }}>{cards}{cards}</div>
      </div>
    </section>
  );
}
