"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUp, Check, Film, ImagePlus, LayoutGrid, Loader2, Menu, Plus, RefreshCw, Sparkles, Wallet, X,
} from "lucide-react";
import type { ProjectState } from "@/lib/project";

type StyleOpt = { price: string; remaining: number };
type Style = { id: string; name: string; description: string; options: Record<number, StyleOpt | undefined> };
type PackLeft = { label: string; remaining: number };
type Conv = { id: string; title: string; created_at: string };

const STEPS = [
  ["product", "Produit"], ["creator", "Créateur"], ["location", "Lieu"], ["script", "Script"], ["video", "Vidéo"],
] as const;
const ORDER = ["product", "creator", "location", "script", "video", "done"];

const LANGUAGES = ["Français", "Anglais", "Français avec expressions locales (Camfranglais, Nouchi…)", "Pidgin English"];
const PLATFORMS = ["TikTok", "Instagram Reels", "Facebook", "WhatsApp Status", "YouTube Shorts"];
const VIDEO_STYLES = ["Propose-moi", "Avis client", "Routine", "Déballage", "Démonstration"];

function Orb({ size = 56 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size }}
      className="shrink-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,#ffd8b0,#f08a3c_45%,#c2410c_80%)] shadow-[0_8px_30px_-6px_rgba(232,89,12,0.55)]" />
  );
}

function groupLabel(iso: string) {
  const days = Math.floor((new Date(new Date().toDateString()).getTime() - new Date(new Date(iso).toDateString()).getTime()) / 86400000);
  return days === 0 ? "Aujourd'hui" : days === 1 ? "Hier" : "Plus ancien";
}

const post = (url: string, body: unknown) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    .then((r) => r.json()).catch(() => ({ error: "Connexion perdue. Réessaie." }));

// ---------------- Formulaire produit (étape 1) ----------------

function ProductForm({ onCreated }: { onCreated: (s: ProjectState) => void }) {
  const [f, setF] = useState({
    brand: "", name: "", what: "", looks: "", hidden: "", benefits: "", buyer: "", worn: false,
    platform: PLATFORMS[0], videoStyle: VIDEO_STYLES[0], vibe: "", direction: "", avoid: "", language: LANGUAGES[0],
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value });

  async function upload(files: FileList) {
    setUploading(true);
    for (const file of Array.from(files).slice(0, 6 - photos.length)) {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/upload", { method: "POST", body: fd }).then((r) => r.json()).catch(() => ({}));
      if (r.url) setPhotos((p) => [...p, r.url]); else setError(r.error ?? "Envoi impossible.");
    }
    setUploading(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(undefined);
    const r = await post("/api/project", { ...f, photos });
    setBusy(false);
    if (r.error) return setError(r.error);
    onCreated(r);
  }

  const field = "w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-ink";
  const label = "mb-1 block text-xs font-semibold text-muted";

  return (
    <form onSubmit={submit} className="mt-8 w-full space-y-5 rounded-3xl border border-line bg-card p-5 text-left shadow-sm sm:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">Étape 1 · Ton produit</p>
        <p className="mt-1 text-sm text-muted">Plus tu es précis, plus la pub sera fidèle.</p>
      </div>

      <div>
        <span className={label}>Photos du produit (recommandé, jusqu&apos;à 6)</span>
        <div className="flex flex-wrap gap-2">
          {photos.map((u) => (
            <div key={u} className="relative h-20 w-20 overflow-hidden rounded-xl border border-line">
              <img src={u} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => setPhotos((p) => p.filter((x) => x !== u))}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white" aria-label="Retirer"><X size={12} /></button>
            </div>
          ))}
          {photos.length < 6 && (
            <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line text-xs text-muted hover:border-ink">
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && upload(e.target.files)} />
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />} Ajouter
            </label>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label><span className={label}>Marque *</span><input required value={f.brand} onChange={set("brand")} className={field} placeholder="ex : Mama Beauty" /></label>
        <label><span className={label}>Nom du produit *</span><input required value={f.name} onChange={set("name")} className={field} placeholder="ex : Huile de karité pure" /></label>
        <label className="sm:col-span-2"><span className={label}>C&apos;est quoi ? (type, taille) *</span><input required value={f.what} onChange={set("what")} className={field} placeholder="ex : flacon d'huile de 100 ml" /></label>
        {photos.length ? (
          <label className="sm:col-span-2"><span className={label}>Ce que les photos ne montrent pas</span><input value={f.hidden} onChange={set("hidden")} className={field} placeholder="ex : texte au dos, l'intérieur, le produit ouvert…" /></label>
        ) : (
          <label className="sm:col-span-2"><span className={label}>À quoi il ressemble ? * (forme, couleurs, bouchon, texte exact de l&apos;étiquette)</span><textarea required rows={2} value={f.looks} onChange={set("looks")} className={field} /></label>
        )}
        <label className="sm:col-span-2"><span className={label}>Pourquoi il est bien ? *</span><textarea required rows={2} value={f.benefits} onChange={set("benefits")} className={field} placeholder="ex : 100 % naturel, hydrate 24 h, fabriqué au Burkina" /></label>
        <label className="sm:col-span-2"><span className={label}>Qui l&apos;achète ? *</span><input required value={f.buyer} onChange={set("buyer")} className={field} placeholder="ex : femmes de 25 à 45 ans à Douala" /></label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={f.worn} onChange={set("worn")} className="h-4 w-4 accent-[var(--brand)]" /> Le produit se porte (vêtement, chaussures, bijou, sac)</label>
      </div>

      <details className="rounded-2xl border border-line p-4">
        <summary className="cursor-pointer text-sm font-semibold">Ta vidéo (facultatif)</summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label><span className={label}>Plateforme</span><select value={f.platform} onChange={set("platform")} className={field}>{PLATFORMS.map((x) => <option key={x}>{x}</option>)}</select></label>
          <label><span className={label}>Style de vidéo</span><select value={f.videoStyle} onChange={set("videoStyle")} className={field}>{VIDEO_STYLES.map((x) => <option key={x}>{x}</option>)}</select></label>
          <label className="sm:col-span-2"><span className={label}>Langue parlée dans la vidéo</span><select value={f.language} onChange={set("language")} className={field}>{LANGUAGES.map((x) => <option key={x}>{x}</option>)}</select></label>
          <label><span className={label}>Ambiance du créateur</span><input value={f.vibe} onChange={set("vibe")} className={field} placeholder="ex : jeune maman souriante" /></label>
          <label><span className={label}>Idée en tête</span><input value={f.direction} onChange={set("direction")} className={field} /></label>
          <label className="sm:col-span-2"><span className={label}>À ne jamais dire</span><input value={f.avoid} onChange={set("avoid")} className={field} placeholder="ex : « guérit », « miracle »" /></label>
        </div>
      </details>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <button disabled={busy || uploading} className="flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3.5 font-semibold text-white disabled:opacity-50">
        {busy ? <><Loader2 size={16} className="animate-spin" /> Awa prépare la fiche produit…</> : <><Sparkles size={16} /> Créer la fiche produit</>}
      </button>
    </form>
  );
}

// ---------------- Studio ----------------

export default function Studio({ conversations, styles: initialStyles, durations, packs, isAdmin, firstName }: {
  conversations: Conv[]; styles: Style[]; durations: number[]; packs: PackLeft[]; isAdmin: boolean; firstName: string;
}) {
  const [styles, setStyles] = useState(initialStyles);
  const [convs, setConvs] = useState(conversations);
  const [project, setProject] = useState<ProjectState | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<string>();
  const [error, setError] = useState<string>();
  const [menu, setMenu] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  const apply = useCallback((s: ProjectState & { error?: string }) => {
    if (s.error) setError(s.error);
    if (s.id) setProject(s);
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [project?.messages.length, project?.step, project?.video?.status]);

  // Suivi des images et de la vidéo en cours.
  const waiting = project && (
    Object.values(project.images).some((i) => i?.status === "processing") || project.video?.status === "processing"
  );
  useEffect(() => {
    if (!waiting || !project) return;
    const t = setInterval(async () => {
      const r = await fetch(`/api/project/${project.id}`).then((r) => r.json()).catch(() => null);
      if (r?.id) setProject(r);
    }, 5000);
    return () => clearInterval(t);
  }, [waiting, project]);

  function reset() {
    setProject(null); setPicked(undefined); setError(undefined); setInput(""); setMenu(false);
  }

  async function open(id: string) {
    setMenu(false); setError(undefined); setPicked(undefined);
    const r = await fetch(`/api/project/${id}`).then((r) => r.json()).catch(() => null);
    if (r?.id) setProject(r);
  }

  function created(s: ProjectState) {
    setProject(s);
    setConvs((c) => [{ id: s.id, title: s.title, created_at: new Date().toISOString() }, ...c]);
  }

  async function act(body: Record<string, unknown>) {
    if (!project || busy) return;
    setBusy(true); setError(undefined);
    apply(await post(`/api/project/${project.id}`, body));
    setBusy(false);
  }

  function send() {
    const text = input.trim();
    if (!text || !project) return;
    setInput("");
    act(project.options?.length ? { action: "pick", text } : { action: "revise", text });
  }

  function adjust(styleId: string, d: number, delta: number) {
    setStyles((ss) => ss.map((s) => s.id !== styleId || !s.options[d] ? s : { ...s, options: { ...s.options, [d]: { ...s.options[d]!, remaining: s.options[d]!.remaining + delta } } }));
  }

  async function generate() {
    const style = styles.find((s) => s.id === picked);
    if (!style || !project?.duration) return;
    setBusy(true); setError(undefined);
    const r = await post("/api/generate", { conversationId: project.id, styleId: style.id });
    setBusy(false);
    if (r.error) return setError(r.error);
    if (!isAdmin) adjust(style.id, project.duration, -1);
    open(project.id);
  }

  async function buy(styleId: string) {
    if (!project?.duration) return;
    setBusy(true);
    const r = await post("/api/pay", { plan: "single", styleId, duration: project.duration, conversationId: project.id });
    setBusy(false);
    if (r.url) window.location.href = r.url; else setError(r.error);
  }

  const groups = convs.reduce<Record<string, Conv[]>>((g, c) => ((g[groupLabel(c.created_at)] ??= []).push(c), g), {});
  const stepIndex = project ? ORDER.indexOf(project.step) : -1;
  const kind = project && (["product", "creator", "location"] as const).find((k) => k === project.step);
  const img = kind ? project?.images[kind] : null;
  const style = styles.find((s) => s.id === picked);
  const opt = project?.duration ? style?.options[project.duration] : undefined;
  const canCreate = !!opt && (isAdmin || opt.remaining > 0);
  const composerOn = !!project && (
    (!!project.options?.length && project.step !== "script") || (project.step === "script" && (!!project.options?.length || !!project.script)) ||
    (!!kind && img?.status === "ready")
  );

  const sidebar = (
    <aside className="flex h-full w-72 flex-col border-r border-line bg-card">
      <div className="flex items-center justify-between px-5 pb-3 pt-5">
        <p className="text-sm font-bold">Mes projets</p>
        <button onClick={() => setMenu(false)} className="rounded-lg p-1 text-muted lg:hidden" aria-label="Fermer"><X size={18} /></button>
      </div>
      <div className="px-4">
        <button onClick={reset} className="flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3 text-sm font-semibold text-white shadow-md hover:opacity-90">
          <Plus size={16} /> Nouvelle pub <Sparkles size={14} />
        </button>
      </div>
      <nav className="mt-5 space-y-0.5 px-3 text-sm">
        <Link href="/mes-videos" className="flex items-center gap-3 rounded-xl px-3 py-2 text-muted hover:bg-bg hover:text-ink"><Film size={16} /> Mes vidéos</Link>
        <Link href="/tarifs" className="flex items-center gap-3 rounded-xl px-3 py-2 text-muted hover:bg-bg hover:text-ink"><LayoutGrid size={16} /> Styles & tarifs</Link>
      </nav>
      <div className="mt-5 flex-1 overflow-y-auto px-3">
        {Object.entries(groups).map(([lbl, items]) => (
          <div key={lbl} className="mb-4">
            <p className="px-3 pb-1 text-xs font-medium text-muted">{lbl}</p>
            {items.map((c) => (
              <button key={c.id} onClick={() => open(c.id)}
                className={`block w-full truncate rounded-xl px-3 py-2 text-left text-sm hover:bg-bg ${c.id === project?.id ? "bg-bg font-semibold" : "text-ink/80"}`}>{c.title}</button>
            ))}
          </div>
        ))}
        {!convs.length && <p className="px-3 text-sm text-muted">Tes projets apparaîtront ici.</p>}
      </div>
      <div className="m-4 rounded-2xl border border-line bg-bg p-4">
        <p className="flex items-center gap-2 text-xs text-muted"><Wallet size={14} /> Mes pubs restantes</p>
        {packs.length ? (
          <ul className="mt-2 space-y-1 text-sm">{packs.map((p) => <li key={p.label} className="flex justify-between"><span>{p.label}</span><b>{p.remaining}</b></li>)}</ul>
        ) : <p className="mt-1 text-sm text-muted">Aucun pack. Tu peux payer pub par pub.</p>}
        <Link href="/tarifs" className="mt-3 flex items-center justify-center rounded-full border border-line bg-card py-2 text-sm font-semibold hover:border-brand">Acheter un pack</Link>
      </div>
    </aside>
  );

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-30 flex bg-[#f6f5f3]">
      <div className="hidden lg:block">{sidebar}</div>
      {menu && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {sidebar}
          <button className="flex-1 bg-black/30" onClick={() => setMenu(false)} aria-label="Fermer le menu" />
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <button onClick={() => setMenu(true)} className="rounded-lg p-2 lg:hidden" aria-label="Menu"><Menu size={20} /></button>
            <p className="truncate font-bold">{project?.title ?? "Nouvelle pub"}</p>
          </div>
          {project && (
            <ol className="hidden items-center gap-1 text-xs md:flex">
              {STEPS.map(([k, l], i) => (
                <li key={k} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold ${i < stepIndex ? "text-accent" : i === stepIndex ? "bg-ink text-white" : "text-muted"}`}>
                  {i < stepIndex ? <Check size={12} /> : <span>{i + 1}</span>} {l}
                </li>
              ))}
            </ol>
          )}
        </header>
        {project && (
          <div className="px-4 pb-2 md:hidden">
            <div className="flex gap-1">{STEPS.map(([k], i) => <div key={k} className={`h-1 flex-1 rounded-full ${i <= stepIndex ? "bg-ink" : "bg-line"}`} />)}</div>
            <p className="mt-1 text-xs text-muted">Étape {Math.min(stepIndex + 1, 5)}/5 · {STEPS[Math.min(stepIndex, 4)][1]}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 sm:px-8">
          <div className="mx-auto max-w-3xl pb-6">
            {!project ? (
              <div className="flex flex-col items-center pt-8 text-center">
                <Orb size={64} />
                <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">Salut{firstName ? `, ${firstName}` : ""}</h1>
                <p className="mt-2 max-w-md text-muted">On crée ta pub en 5 étapes : ton produit, le créateur, le lieu, le script, puis la vidéo. Tu valides chaque étape.</p>
                <ProductForm onCreated={created} />
              </div>
            ) : (
              <div className="space-y-5 pt-2">
                {project.messages.map((m, i) => m.role === "assistant" ? (
                  <div key={i} className="flex gap-3"><Orb size={30} /><div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tl-md border border-line bg-card px-4 py-3 text-[15px] leading-relaxed shadow-sm">{m.content}</div></div>
                ) : (
                  <div key={i} className="flex justify-end"><div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-md bg-ink px-4 py-3 text-[15px] leading-relaxed text-white">{m.content}</div></div>
                ))}

                {/* Images validées des étapes précédentes */}
                {stepIndex > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {(["product", "creator", "location"] as const).map((k) => {
                      const i = project.images[k];
                      return i?.approved && i.url ? (
                        <a key={k} href={i.url} target="_blank" className="overflow-hidden rounded-xl border border-line bg-card">
                          <img src={i.url} alt="" className="aspect-video w-full object-cover" />
                          <p className="px-2 py-1 text-[11px] font-semibold text-muted">{{ product: "Fiche produit", creator: "Créateur", location: "Lieu" }[k]}</p>
                        </a>
                      ) : null;
                    })}
                  </div>
                )}

                {/* Étapes image : produit, créateur, lieu */}
                {kind && project.options?.length ? (
                  <div className="grid gap-2 sm:grid-cols-3">
                    {project.options.map((o, i) => (
                      <button key={i} disabled={busy} onClick={() => act({ action: "pick", index: i })}
                        className="rounded-2xl border border-line bg-card p-4 text-left transition hover:border-ink disabled:opacity-50">
                        <p className="text-xs font-semibold text-muted">Option {i + 1}</p>
                        <p className="mt-1 font-bold leading-snug">{o.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted">{o.detail}</p>
                      </button>
                    ))}
                  </div>
                ) : null}

                {kind && img && (
                  <div className="rounded-3xl border border-line bg-card p-4 shadow-sm">
                    {img.status === "processing" && (
                      <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-2xl bg-bg text-sm text-muted">
                        <Loader2 className="animate-spin" /> Création de l&apos;image… (environ 30 secondes)
                      </div>
                    )}
                    {img.status === "failed" && (
                      <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-2xl bg-bg text-sm">
                        L&apos;image n&apos;a pas pu être créée.
                        <button disabled={busy} onClick={() => act({ action: "regenerate" })} className="rounded-full bg-ink px-4 py-2 font-semibold text-white">Réessayer (gratuit)</button>
                      </div>
                    )}
                    {img.status === "ready" && img.url && (
                      <>
                        <a href={img.url} target="_blank"><img src={img.url} alt="" className="w-full rounded-2xl" /></a>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button disabled={busy} onClick={() => act({ action: "approve" })}
                            className="flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                            {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Valider et continuer
                          </button>
                          <button disabled={busy || project.retriesLeft === 0} onClick={() => act({ action: "regenerate" })}
                            className="flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm font-semibold disabled:opacity-40">
                            <RefreshCw size={14} /> Autre version
                          </button>
                          <span className="text-xs text-muted">{project.retriesLeft} essai{project.retriesLeft > 1 ? "s" : ""} restant{project.retriesLeft > 1 ? "s" : ""} · ou écris ce qu&apos;il faut changer</span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Étape script */}
                {project.step === "script" && !project.duration && (
                  <div className="flex flex-wrap gap-2">
                    {durations.map((d) => (
                      <button key={d} disabled={busy} onClick={() => act({ action: "duration", duration: d })}
                        className="rounded-2xl border border-line bg-card px-6 py-4 text-left hover:border-ink disabled:opacity-50">
                        <p className="text-xl font-extrabold">{d} s</p>
                        <p className="text-xs text-muted">{d <= 8 ? "Spot très court" : d <= 15 ? "Pub courte" : "Pub complète"}</p>
                      </button>
                    ))}
                  </div>
                )}
                {project.step === "script" && project.options?.length ? (
                  <div className="grid gap-2 sm:grid-cols-3">
                    {project.options.map((o, i) => (
                      <button key={i} disabled={busy} onClick={() => act({ action: "pick", index: i })}
                        className="rounded-2xl border border-line bg-card p-4 text-left hover:border-ink disabled:opacity-50">
                        <p className="text-xs font-semibold text-muted">Idée {i + 1}</p>
                        <p className="mt-1 font-bold leading-snug">{o.title}</p>
                        <p className="mt-1 text-xs text-muted">{o.detail}</p>
                      </button>
                    ))}
                  </div>
                ) : null}
                {project.step === "script" && project.script && (
                  <div className="rounded-3xl border border-line bg-card p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-accent">Script · {project.duration} s · {project.product?.language}</p>
                    <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{project.script}</p>
                    <button disabled={busy} onClick={() => act({ action: "approve" })}
                      className="mt-4 flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                      <Check size={15} /> Valider le script
                    </button>
                  </div>
                )}

                {/* Étape vidéo */}
                {project.step === "video" && project.duration && (
                  <div className="space-y-3 rounded-3xl border border-line bg-card p-5 shadow-sm">
                    <p className="font-bold">Choisis le style de ta pub de {project.duration} s</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {styles.map((s) => {
                        const o = s.options[project.duration!];
                        return (
                          <button key={s.id} onClick={() => setPicked(s.id)} disabled={!o}
                            className={`rounded-2xl border p-4 text-left transition disabled:opacity-40 ${picked === s.id && o ? "border-ink bg-bg ring-1 ring-ink" : "border-line hover:border-ink/40"}`}>
                            <span className="font-bold">{s.name}</span>
                            <p className="mt-1 text-xs leading-relaxed text-muted">{s.description}</p>
                            <p className="mt-2 text-sm">{o ? <><b>{o.price}</b>{o.remaining > 0 && <span className="text-accent"> · {o.remaining} restante{o.remaining > 1 ? "s" : ""}</span>}</> : <>Disponible en {Object.keys(s.options).join(" / ")} s</>}</p>
                          </button>
                        );
                      })}
                    </div>
                    {style && opt && (canCreate ? (
                      <button onClick={generate} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3.5 font-semibold text-white disabled:opacity-50">
                        <Sparkles size={16} /> {busy ? "Lancement…" : isAdmin ? "Créer la pub (admin, gratuit)" : "Créer la pub · 1 pub de ton pack"}
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <button onClick={() => buy(style.id)} disabled={busy} className="w-full rounded-full bg-brand py-3.5 font-semibold text-white disabled:opacity-50">Payer {opt.price} et créer la pub</button>
                        <p className="text-center text-xs text-muted">Paiement Mobile Money. La pub se crée automatiquement après confirmation.</p>
                      </div>
                    ))}
                  </div>
                )}

                {project.video && project.step === "done" && (
                  <div className="rounded-3xl border border-line bg-card p-6 text-center shadow-sm">
                    {project.video.status === "processing" && (<><Loader2 className="mx-auto mb-3 animate-spin text-brand" size={32} /><p className="font-semibold">Ta pub est en cours de création…</p><p className="mt-1 text-sm text-muted">Ça prend 5 à 15 minutes. Tu peux fermer la page, elle sera dans « Mes vidéos ».</p></>)}
                    {project.video.status === "ready" && project.video.url && (<><video src={project.video.url} controls playsInline className="mx-auto max-h-[70vh] rounded-2xl" /><div className="mt-4 flex justify-center gap-2"><a href={project.video.url} download className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white">Télécharger</a><button onClick={() => act({ action: "again" })} className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold">Une autre version</button></div></>)}
                  </div>
                )}
                {project.video?.status === "failed" && project.step === "video" && (
                  <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">La dernière pub n&apos;a pas pu être créée. Elle ne t&apos;a pas été décomptée : relance-la.</p>
                )}
                {busy && <div className="flex items-center gap-3"><Orb size={30} /><span className="flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 120}ms` }} />)}</span></div>}
              </div>
            )}
            {error && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            <div ref={bottom} />
          </div>
        </div>

        {composerOn && (
          <div className="px-4 pb-4 sm:px-8">
            <form onSubmit={(e) => { e.preventDefault(); send(); }}
              className="mx-auto flex max-w-3xl items-end gap-2 rounded-3xl border border-line bg-card p-3 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.15)]">
              <Sparkles size={16} className="mb-2.5 ml-1 shrink-0 text-muted" />
              <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={1} disabled={busy}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={project?.options?.length ? "Ou décris ta propre idée…" : "Dis ce qu'il faut changer…"}
                className="max-h-40 min-h-[40px] w-full resize-none bg-transparent py-2 text-[15px] outline-none placeholder:text-muted" />
              <button disabled={busy || !input.trim()} className="flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
                <ArrowUp size={15} /> Envoyer
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
