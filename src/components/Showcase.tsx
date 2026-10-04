import { placeholders, showcase } from "@/content/showcase";
import LazyVideo from "./LazyVideo";

function Frame({ children, handle, caption, category }: { children: React.ReactNode; handle: string; caption: string; category: string }) {
  return (
    <div className="relative mx-2 aspect-[9/16] w-44 shrink-0 overflow-hidden rounded-3xl bg-ink shadow-lg sm:w-56">
      {children}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />
      <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold text-ink">{category}</span>
      <div className="absolute inset-x-0 bottom-0 p-3 text-white">
        <p className="text-xs font-bold">@{handle}</p>
        <p className="mt-1 text-xs leading-snug text-white/90">{caption}</p>
      </div>
    </div>
  );
}

export default function Showcase() {
  const cards = showcase.length
    ? showcase.map((m) => (
        <Frame key={m.src} {...m}>
          {m.type === "video"
            ? <LazyVideo src={m.src} poster={m.poster} label={m.caption} />
            : <img src={m.src} alt={m.caption} loading="lazy" className="h-full w-full object-cover" />}
        </Frame>
      ))
    : placeholders.map((p) => (
        <Frame key={p.handle} {...p}><div className={`h-full w-full bg-gradient-to-br ${p.tone}`} /></Frame>
      ));
  return (
    <div className="marquee-wrap overflow-hidden py-2">
      <div className="marquee" style={{ ["--speed" as string]: "45s" }}>{cards}{cards.map((c, i) => <div key={`dup-${i}`} aria-hidden className="shrink-0">{c}</div>)}</div>
    </div>
  );
}
