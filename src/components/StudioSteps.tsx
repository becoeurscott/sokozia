"use client";

import { useEffect, useState } from "react";
import { Check, ChevronLeft, Clapperboard, ImagePlus, Loader2, MapPin, Pencil, Play, RefreshCw, Sparkles, Upload, Wallet } from "lucide-react";
import { CREATORS, creatorFiles } from "@/content/creators";
import { FORMATS } from "@/content/formats";
import type { ProjectState } from "@/lib/project";
import Storyboard from "./Storyboard";

export type StyleCard = {
  id: string; name: string; description: string; quality: string; sample: { poster: string; clip: string } | null;
  durations: number[]; options: Record<number, { price: string; remaining: number } | undefined>;
};

const card = "rounded-2xl border border-line bg-card text-left transition hover:border-ink disabled:opacity-50";
const tag = "rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent";

/* ---------- Image d'étape (fiche produit, lieu) : valider / autre version ---------- */

export function ImageStep({ img, retriesLeft, busy, label, onApprove, onRegenerate }: {
  img: { status: string; url: string | null } | null; retriesLeft: number; busy: boolean; label: string;
  onApprove: () => void; onRegenerate: () => void;
}) {
  if (!img) return null;
  return (
    <div className="rounded-3xl border border-line bg-card p-4 shadow-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-accent">{label}</p>
      {img.status === "processing" && (
        <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-2xl bg-bg text-sm text-muted">
          <Loader2 className="animate-spin" /> Création de l&apos;image… (environ 30 secondes)
        </div>
      )}
      {img.status === "failed" && (
        <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-2xl bg-bg text-sm">
          L&apos;image n&apos;a pas pu être créée.
          <button disabled={busy} onClick={onRegenerate} className="rounded-full bg-ink px-4 py-2 font-semibold text-white">Réessayer (gratuit)</button>
        </div>
      )}
      {img.status === "ready" && img.url && (
        <>
          <a href={img.url} target="_blank"><img src={img.url} alt="" className="w-full rounded-2xl" /></a>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button disabled={busy} onClick={onApprove} className="flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Valider et continuer
            </button>
            <button disabled={busy || retriesLeft === 0} onClick={onRegenerate} className="flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm font-semibold disabled:opacity-40">
              <RefreshCw size={14} /> Autre version
            </button>
            <span className="text-xs text-muted">{retriesLeft} essai{retriesLeft > 1 ? "s" : ""} restant{retriesLeft > 1 ? "s" : ""} · ou écris ce qu&apos;il faut changer</span>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Étape 1 : invitation à envoyer des photos ---------- */

export function PhotoPrompt({ onFiles, uploading, count }: { onFiles: (f: FileList) => void; uploading: boolean; count: number }) {
  return (
    <label className={`${card} flex cursor-pointer items-center gap-4 p-4`}>
      <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && onFiles(e.target.files)} />
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
        {uploading ? <Loader2 size={22} className="animate-spin" /> : <ImagePlus size={22} />}
      </span>
      <span>
        <span className="block font-bold">{count ? `${count} photo${count > 1 ? "s" : ""} envoyée${count > 1 ? "s" : ""} · en ajouter` : "Ajouter des photos de ton produit"}</span>
        <span className="block text-xs text-muted">Recommandé : le produit sera reproduit à l&apos;identique dans la pub (jusqu&apos;à 6 photos).</span>
      </span>
    </label>
  );
}

/* ---------- Étape 2 : créateurs proposés (cartes) + voir tous ---------- */

export function CreatorPicks({ picks, busy, onPick }: { picks: { id: string; reason: string }[]; busy: boolean; onPick: (id: string) => void }) {
  const [all, setAll] = useState(false);
  const [filter, setFilter] = useState("Tous");
  const [playing, setPlaying] = useState<string>();
  const countries = [...new Set(CREATORS.map((c) => c.country))];
  const list = all
    ? CREATORS.filter((c) => filter === "Tous" || c.country === filter || (filter === "Femmes" && c.gender === "female") || (filter === "Hommes" && c.gender === "male"))
    : picks.map((p) => CREATORS.find((c) => c.id === p.id)!).filter(Boolean);
  const reason = (id: string) => picks.find((p) => p.id === id)?.reason;
  return (
    <div className="rounded-3xl border border-line bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">{all ? "Tous les créateurs" : "Awa te propose"}</p>
        <button onClick={() => setAll(!all)} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:border-ink">
          {all ? "Revenir aux propositions" : `Voir les ${CREATORS.length}`}
        </button>
      </div>
      {all && (
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
          {["Tous", "Femmes", "Hommes", ...countries].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${filter === f ? "bg-ink text-white" : "border border-line text-muted"}`}>{f}</button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {list.map((c) => {
          const f = creatorFiles(c.id);
          const why = reason(c.id);
          return (
            <div key={c.id} className="overflow-hidden rounded-2xl border border-line bg-bg">
              <div className="relative aspect-[3/4] bg-ink">
                {playing === c.id
                  ? <video src={f.intro} poster={f.portrait} autoPlay controls playsInline onEnded={() => setPlaying(undefined)} className="h-full w-full object-cover" />
                  : <img src={f.portrait} alt={c.name} loading="lazy" className="h-full w-full object-cover" />}
                {playing !== c.id && (
                  <button onClick={() => setPlaying(c.id)} className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white"><Play size={11} fill="white" /> Écouter</button>
                )}
                {why && <span className="absolute right-2 top-2 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-white">Conseillé</span>}
              </div>
              <div className="p-3">
                <p className="font-bold leading-tight">{c.name}, {c.age} ans</p>
                <p className="text-[11px] text-muted">{c.country} · {c.specialty}</p>
                {why && <p className="mt-1 text-xs leading-snug text-ink/80">{why}</p>}
                <button disabled={busy} onClick={() => onPick(c.id)} className="mt-2 w-full rounded-full bg-ink py-2 text-xs font-semibold text-white disabled:opacity-50">Choisir {c.name}</button>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted">Tu préfères un créateur sur mesure ? Décris-le dans le chat (compte comme un essai).</p>
    </div>
  );
}

/* ---------- Étape 3 : formats (cartes avec image d'exemple) ---------- */

export function FormatPicks({ picks, busy, onPick }: { picks: { id: string; reason: string }[]; busy: boolean; onPick: (id: string) => void }) {
  const [all, setAll] = useState(false);
  const [playing, setPlaying] = useState<string>();
  const list = all ? FORMATS : picks.map((p) => FORMATS.find((f) => f.id === p.id)!).filter(Boolean);
  const reason = (id: string) => picks.find((p) => p.id === id)?.reason;
  return (
    <div className="rounded-3xl border border-line bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">{all ? "Tous les formats" : "Formats conseillés"}</p>
        <button onClick={() => setAll(!all)} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:border-ink">{all ? "Voir les conseillés" : `Voir les ${FORMATS.length}`}</button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {list.map((f) => {
          const why = reason(f.id);
          return (
            <div key={f.id} className="overflow-hidden rounded-2xl border border-line bg-bg">
              <div className="relative aspect-[9/14] bg-ink">
                {playing === f.id
                  ? <video src={`/showcase/ugc/${f.clip}.mp4`} poster={`/showcase/ugc/${f.clip}.jpg`} autoPlay controls playsInline onEnded={() => setPlaying(undefined)} className="h-full w-full object-cover" />
                  : <img src={`/showcase/ugc/${f.clip}.jpg`} alt={f.label} loading="lazy" className="h-full w-full object-cover" />}
                {playing !== f.id && <button onClick={() => setPlaying(f.id)} className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white"><Play size={11} fill="white" /> Exemple</button>}
                {why && <span className="absolute right-2 top-2 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-white">Conseillé</span>}
              </div>
              <div className="p-3">
                <p className="font-bold leading-tight">{f.label}</p>
                <p className="mt-0.5 text-[11px] text-muted">{why ?? `Pour ${f.when}`}</p>
                <button disabled={busy} onClick={() => onPick(f.id)} className="mt-2 w-full rounded-full bg-ink py-2 text-xs font-semibold text-white disabled:opacity-50">Choisir</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Étape 4 : lieux proposés + photo du client ---------- */

export function LocationPicks({ options, busy, uploading, onPick, onPhoto }: {
  options: { title: string; detail: string }[]; busy: boolean; uploading: boolean;
  onPick: (index: number) => void; onPhoto: (f: File) => void;
}) {
  return (
    <div className="rounded-3xl border border-line bg-card p-4 shadow-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-accent">Où tourner ?</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map((o, i) => (
          <button key={i} disabled={busy} onClick={() => onPick(i)} className={`${card} p-4`}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent"><MapPin size={18} /></span>
            <p className="mt-2 font-bold leading-snug">{o.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{o.detail}</p>
          </button>
        ))}
        <label className={`${card} flex cursor-pointer flex-col justify-center border-dashed p-4`}>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])} />
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">{uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}</span>
          <p className="mt-2 font-bold leading-snug">Envoyer une photo de mon lieu</p>
          <p className="mt-1 text-xs text-muted">Ta boutique, ton salon, ton atelier…</p>
        </label>
      </div>
      <p className="mt-3 text-xs text-muted">Ou décris un autre lieu dans le chat.</p>
    </div>
  );
}

/* ---------- Étape 5 : style (référence visuelle + qualité), durée, prix ---------- */

export function StylePicks({ styles, styleId, duration, suggested, reason, busy, onStyle, onDuration, onConfirm }: {
  styles: StyleCard[]; styleId: string | null; duration: number | null; suggested: string | null; reason: string | null; busy: boolean;
  onStyle: (id: string) => void; onDuration: (d: number) => void; onConfirm: () => void;
}) {
  const [playing, setPlaying] = useState<string>();
  const chosen = styles.find((s) => s.id === styleId);
  const opt = chosen && duration ? chosen.options[duration] : undefined;
  const covered = !!opt && opt.remaining > 0;
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-line bg-card p-4 shadow-sm">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">Choisis le style</p>
        {reason && <p className="mb-3 rounded-xl bg-accent/10 px-3 py-2 text-sm text-accent"><b>Awa conseille {styles.find((s) => s.id === suggested)?.name}</b> : {reason}</p>}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {styles.map((s) => {
            const from = s.options[s.durations[0]]?.price;
            const active = styleId === s.id;
            return (
              <div key={s.id} className={`overflow-hidden rounded-2xl border bg-bg transition ${active ? "border-ink ring-2 ring-ink/20" : "border-line"}`}>
                <div className="relative aspect-[9/14] bg-ink">
                  {s.sample && (playing === s.id
                    ? <video src={s.sample.clip} poster={s.sample.poster} autoPlay controls playsInline onEnded={() => setPlaying(undefined)} className="h-full w-full object-cover" />
                    : <img src={s.sample.poster} alt={s.name} loading="lazy" className="h-full w-full object-cover" />)}
                  {s.sample && playing !== s.id && <button onClick={() => setPlaying(s.id)} className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white"><Play size={11} fill="white" /> Exemple</button>}
                  {suggested === s.id && <span className="absolute right-2 top-2 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-white">Conseillé</span>}
                  {active && <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white"><Check size={14} /></span>}
                </div>
                <div className="p-3">
                  <p className="font-bold leading-tight">{s.name}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted">{s.quality}</p>
                  <p className="mt-1.5 text-xs">dès <b>{from}</b></p>
                  <button disabled={busy} onClick={() => onStyle(s.id)} className={`mt-2 w-full rounded-full py-2 text-xs font-semibold disabled:opacity-50 ${active ? "bg-ink text-white" : "border border-line hover:border-ink"}`}>{active ? "Choisi" : "Choisir"}</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {chosen && (
        <div className="rounded-3xl border border-line bg-card p-4 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent">Durée et prix · {chosen.name}</p>
          <div className="flex flex-wrap gap-2">
            {chosen.durations.map((d) => {
              const o = chosen.options[d];
              const active = duration === d;
              return (
                <button key={d} disabled={busy} onClick={() => onDuration(d)}
                  className={`rounded-2xl border px-5 py-3 text-left transition disabled:opacity-50 ${active ? "border-ink bg-bg ring-2 ring-ink/20" : "border-line hover:border-ink"}`}>
                  <p className="text-xl font-extrabold">{d} s</p>
                  <p className="text-xs text-muted">{d <= 8 ? "Spot très court" : d <= 15 ? "Pub courte" : "Pub complète"}</p>
                  <p className="mt-1 text-sm font-bold">{o?.price}</p>
                  {o && o.remaining > 0 && <span className={tag}>{o.remaining} restante{o.remaining > 1 ? "s" : ""} dans ton pack</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {chosen && opt && duration && (
        <div className="rounded-3xl bg-ink p-5 text-white shadow-lg">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/60"><Wallet size={14} /> Récapitulatif</p>
          <p className="mt-2 text-lg font-bold">Pub {chosen.name} · {duration} secondes</p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-white/70">Prix de cette pub</p>
              <p className="text-3xl font-extrabold">{opt.price}</p>
            </div>
            <div className="text-right text-sm">
              {covered
                ? <p className="rounded-full bg-accent px-3 py-1 font-semibold">Couverte par ton pack · reste {opt.remaining}</p>
                : <p className="text-white/70">À payer par Mobile Money<br />après l&apos;aperçu</p>}
            </div>
          </div>
          <p className="mt-3 text-xs text-white/60">Inclus : l&apos;aperçu de ta pub avant de payer, 3 essais par étape, et aucune pub décomptée si la création échoue.</p>
          <button disabled={busy} onClick={onConfirm} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3.5 font-semibold text-white disabled:opacity-50">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Confirmer et voir l&apos;aperçu
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- Étape 6 : aperçu (image + découpage) ---------- */

export function PreviewPanel({ project, busy, onApprove, onRegenerate, onEditShots, onBack }: {
  project: ProjectState; busy: boolean; onApprove: () => void; onRegenerate: () => void; onEditShots: (shots: NonNullable<ProjectState["shots"]>) => void; onBack: () => void;
}) {
  const frame = project.images.frame;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,220px)_1fr]">
        <div className="rounded-3xl border border-line bg-card p-3 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent">À quoi ressemblera ta pub</p>
          <div className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-ink">
            {frame?.status === "ready" && frame.url && <img src={frame.url} alt="Aperçu de la pub" className="h-full w-full object-cover" />}
            {(!frame || frame.status === "processing") && <div className="flex h-full flex-col items-center justify-center gap-2 text-xs text-white/70"><Loader2 className="animate-spin" /> Aperçu en cours…</div>}
            {frame?.status === "failed" && <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center text-xs text-white/80">L&apos;aperçu n&apos;a pas pu être créé.<button onClick={onRegenerate} className="rounded-full bg-white px-3 py-1 font-semibold text-ink">Réessayer</button></div>}
          </div>
          <button disabled={busy || project.retriesLeft === 0 || frame?.status !== "ready"} onClick={onRegenerate} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full border border-line py-2 text-xs font-semibold disabled:opacity-40"><RefreshCw size={12} /> Autre aperçu ({project.retriesLeft})</button>
        </div>
        <div className="min-w-0">
          {project.shots?.length ? (
            <Storyboard key={JSON.stringify(project.shots)} shots={project.shots} busy={busy}
              header={`Découpage · ${project.duration} s${project.format ? ` · ${project.format}` : ""}`}
              onSave={onEditShots} onApprove={onApprove} />
          ) : <div className="flex h-40 items-center justify-center rounded-3xl border border-line bg-card text-sm text-muted"><Loader2 className="mr-2 animate-spin" /> Awa écrit le découpage…</div>}
        </div>
      </div>
      <button onClick={onBack} disabled={busy} className="flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink"><ChevronLeft size={16} /> Changer de style ou de durée</button>
    </div>
  );
}

/* ---------- Étape 7 : génération (animation) puis vidéo ---------- */

const PHASES = [
  [0, "Préparation de la scène"], [25, "Mise en place du créateur et du produit"], [70, "Tournage de la pub"], [140, "Montage, voix et son"], [220, "Dernières finitions"],
] as const;

export function Generating({ startedAt, frame }: { startedAt: string; frame: string | null }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const tick = () => setT(Math.max(0, (Date.now() - new Date(startedAt).getTime()) / 1000));
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [startedAt]);
  const phase = [...PHASES].reverse().find(([s]) => t >= s)?.[1] ?? PHASES[0][1];
  const pct = Math.min(94, Math.round(100 * (1 - Math.exp(-t / 150))));
  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-card shadow-sm">
      <div className="relative grid gap-4 p-5 sm:grid-cols-[140px_1fr]">
        <div className="relative mx-auto aspect-[9/16] w-32 overflow-hidden rounded-2xl bg-ink sm:w-full">
          {frame && <img src={frame} alt="" className="h-full w-full object-cover opacity-70" />}
          <div className="absolute inset-0 animate-pulse bg-gradient-to-t from-brand/60 via-transparent to-transparent" />
          <div className="absolute inset-x-0 top-0 h-1 animate-[marquee_2s_linear_infinite] bg-white/70" style={{ width: "40%" }} />
        </div>
        <div className="flex flex-col justify-center">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent"><Clapperboard size={14} /> Ta pub est en cours de création</p>
          <p className="mt-2 text-xl font-bold">{phase}…</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg"><div className="h-full rounded-full bg-brand transition-all duration-1000" style={{ width: `${pct}%` }} /></div>
          <p className="mt-2 text-sm text-muted">{Math.floor(t / 60)} min {String(Math.floor(t % 60)).padStart(2, "0")} s · en général 2 à 10 minutes.</p>
          <p className="mt-1 text-xs text-muted">Tu peux fermer la page : ta pub t&apos;attendra dans « Mes vidéos ».</p>
        </div>
      </div>
    </div>
  );
}

export function VideoReady({ url, onAgain }: { url: string; onAgain: () => void }) {
  return (
    <div className="rounded-3xl border border-line bg-card p-5 text-center shadow-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-accent">Ta pub est prête</p>
      <video src={url} controls playsInline autoPlay className="mx-auto max-h-[70vh] rounded-2xl bg-ink" />
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <a href={url} download className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white">Télécharger</a>
        <button onClick={onAgain} className="flex items-center gap-1.5 rounded-full border border-line px-5 py-2.5 text-sm font-semibold"><Pencil size={14} /> Une autre version</button>
      </div>
    </div>
  );
}
