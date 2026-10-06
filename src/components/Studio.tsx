"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUp, Check, Film, FolderOpen, ImagePlus, LayoutGrid, Loader2, Play, Plus, RefreshCw, Sparkles, Wallet, X,
} from "lucide-react";
import type { ProjectState } from "@/lib/project";
import { CREATORS, creatorFiles } from "@/content/creators";
import { findFormat } from "@/content/formats";
import { ChatRow, useChatActions } from "./ChatActions";
import { useVisualViewport } from "./useVisualViewport";
import Storyboard from "./Storyboard";

type StyleOpt = { price: string; remaining: number };
type Style = { id: string; name: string; description: string; options: Record<number, StyleOpt | undefined> };
type PackLeft = { label: string; remaining: number };
type Conv = { id: string; title: string; created_at: string };

const STEPS = [
  ["product", "Produit"], ["creator", "Créateur"], ["location", "Lieu"], ["script", "Script"], ["video", "Vidéo"],
] as const;
const ORDER = ["product", "creator", "location", "script", "video", "done"];

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

const SUGGESTIONS = ["Je vends une huile de karité", "Mon restaurant à Abidjan", "Ma boutique de perruques", "Des téléphones neufs"];

// ---------------- Galerie des créateurs (étape 2) ----------------

function CreatorGallery({ onPick, busy }: { onPick: (id: string) => void; busy: boolean }) {
  const countries = [...new Set(CREATORS.map((c) => c.country))];
  const [filter, setFilter] = useState("Tous");
  const [playing, setPlaying] = useState<string>();
  const list = CREATORS.filter((c) => filter === "Tous" || c.country === filter || (filter === "Femmes" && c.gender === "female") || (filter === "Hommes" && c.gender === "male"));
  return (
    <div className="rounded-3xl border border-line bg-card p-4 shadow-sm">
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
        {["Tous", "Femmes", "Hommes", ...countries].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${filter === f ? "bg-ink text-white" : "border border-line text-muted hover:text-ink"}`}>{f}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {list.map((c) => {
          const f = creatorFiles(c.id);
          return (
            <div key={c.id} className="overflow-hidden rounded-2xl border border-line bg-bg">
              <div className="relative aspect-[3/4] bg-ink">
                {playing === c.id
                  ? <video src={f.intro} poster={f.portrait} autoPlay controls playsInline onEnded={() => setPlaying(undefined)} className="h-full w-full object-cover" />
                  : <img src={f.portrait} alt={c.name} loading="lazy" className="h-full w-full object-cover" />}
                {playing !== c.id && (
                  <button onClick={() => setPlaying(c.id)} className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white">
                    <Play size={11} fill="white" /> Écouter
                  </button>
                )}
              </div>
              <div className="p-3">
                <p className="font-bold leading-tight">{c.name}, {c.age} ans</p>
                <p className="text-[11px] text-muted">{c.country} · {c.languages.join(", ")}</p>
                <p className="mt-1 text-xs font-semibold text-accent">{c.specialty}</p>
                <button disabled={busy} onClick={() => onPick(c.id)} className="mt-2 w-full rounded-full bg-ink py-2 text-xs font-semibold text-white disabled:opacity-50">Choisir {c.name}</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- Studio ----------------

export default function Studio({ conversations, styles: initialStyles, durations, packs, isAdmin, firstName, initialProjectId }: {
  conversations: Conv[]; styles: Style[]; durations: number[]; packs: PackLeft[]; isAdmin: boolean; firstName: string; initialProjectId?: string;
}) {
  const [styles, setStyles] = useState(initialStyles);
  const [convs, setConvs] = useState(conversations);
  const [project, setProject] = useState<ProjectState | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<string>();
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();
  const [menu, setMenu] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const vv = useVisualViewport();
  const HEADER = 56;

  const apply = useCallback((s: ProjectState & { error?: string }) => {
    if (s.error) setError(s.error);
    if (s.id) setProject(s);
    if (s.step === "video" && s.suggestedStyle) setPicked((p) => p ?? s.suggestedStyle ?? undefined);
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

  const chats = useChatActions(
    (id, title) => {
      setConvs((c) => c.map((x) => (x.id === id ? { ...x, title } : x)));
      setProject((p) => (p && p.id === id ? { ...p, title } : p));
    },
    (id) => {
      setConvs((c) => c.filter((x) => x.id !== id));
      if (project?.id === id) reset();
    },
  );

  // Ouverture directe d'un projet depuis le tableau de bord (/studio?projet=…).
  useEffect(() => {
    if (initialProjectId) open(initialProjectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProjectId]);

  function reset() {
    setProject(null); setPicked(undefined); setError(undefined); setInput(""); setMenu(false);
  }

  async function open(id: string) {
    setMenu(false); setError(undefined); setPicked(undefined);
    const r = await fetch(`/api/project/${id}`).then((r) => r.json()).catch(() => null);
    if (r?.id) { setProject(r); if (r.step === "video" && r.suggestedStyle) setPicked(r.suggestedStyle); }
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

  const intake = !project || (project.step === "product" && !project.product);
  const customCreator = project?.step === "creator" && !project.images.creator;

  async function send(preset?: string) {
    const text = (preset ?? input).trim();
    if ((!text && !photos.length) || busy) return;
    setInput("");
    if (box.current) box.current.style.height = "auto";
    const sent = photos;
    setPhotos([]);
    if (!project) {
      setBusy(true); setError(undefined);
      const r = await post("/api/project", { text, photos: sent });
      setBusy(false);
      if (r.error) { setPhotos(sent); return setError(r.error); }
      created(r);
      return;
    }
    if (intake) return act({ action: "chat", text, photos: sent });
    act(project.options?.length || customCreator ? { action: "pick", text } : { action: "revise", text });
  }

  async function upload(files: FileList) {
    setUploading(true); setError(undefined);
    for (const file of Array.from(files).slice(0, 6 - photos.length)) {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/upload", { method: "POST", body: fd }).then((r) => r.json()).catch(() => ({}));
      if (r.url) setPhotos((p) => [...p, r.url]); else setError(r.error ?? "Envoi impossible.");
    }
    setUploading(false);
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
  const composerOn = intake || customCreator || !!project && (
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
        <Link href="/tableau-de-bord" className="flex items-center gap-3 rounded-xl px-3 py-2 text-muted hover:bg-bg hover:text-ink"><LayoutGrid size={16} /> Tableau de bord</Link>
        <Link href="/mes-videos" className="flex items-center gap-3 rounded-xl px-3 py-2 text-muted hover:bg-bg hover:text-ink"><Film size={16} /> Mes vidéos</Link>
        <Link href="/tarifs" className="flex items-center gap-3 rounded-xl px-3 py-2 text-muted hover:bg-bg hover:text-ink"><LayoutGrid size={16} /> Styles & tarifs</Link>
      </nav>
      <div className="mt-5 flex-1 overflow-y-auto px-3">
        {Object.entries(groups).map(([lbl, items]) => (
          <div key={lbl} className="mb-4">
            <p className="px-3 pb-1 text-xs font-medium text-muted">{lbl}</p>
            {items.map((c) => (
              <ChatRow key={c.id} id={c.id} title={c.title} active={c.id === project?.id} onOpen={() => open(c.id)} rename={chats.rename} remove={chats.remove} />
            ))}
          </div>
        ))}
        {!convs.length && <p className="px-3 text-sm text-muted">Tes projets apparaîtront ici.</p>}
        {chats.error && <p className="mx-3 mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{chats.error}</p>}
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
    <div className="fixed inset-x-0 bottom-0 top-14 z-30 flex bg-[#f6f5f3]"
      style={vv ? { top: vv.top + HEADER, height: vv.height - HEADER, bottom: "auto" } : undefined}>
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
            <button onClick={() => setMenu(true)} className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold lg:hidden" aria-label="Mes projets"><FolderOpen size={14} /> Projets</button>
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
                <p className="mt-2 max-w-md text-muted">Parle-moi de ton produit. Tu peux aussi m&apos;envoyer des photos. Ensuite on choisit le créateur, le lieu et le script ensemble.</p>
                <div className="mt-8 flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((t) => (
                    <button key={t} onClick={() => send(t)} disabled={busy}
                      className="rounded-full border border-line bg-card px-4 py-2 text-sm shadow-sm hover:border-brand disabled:opacity-50">{t}</button>
                  ))}
                </div>
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

                {customCreator && !project.options?.length && (
                  <CreatorGallery busy={busy} onPick={(id) => act({ action: "creator", creatorId: id })} />
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
                    {project.options.map((o, i) => {
                      const f = findFormat(o.format);
                      return (
                        <button key={i} disabled={busy} onClick={() => act({ action: "pick", index: i })}
                          className="flex gap-3 rounded-2xl border border-line bg-card p-3 text-left hover:border-ink disabled:opacity-50 sm:flex-col">
                          {f && <img src={`/showcase/ugc/${f.clip}.jpg`} alt="" className="h-24 w-16 shrink-0 rounded-xl object-cover sm:h-36 sm:w-full" />}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-muted">Idée {i + 1}{f && <span className="ml-1 rounded-full bg-brand/10 px-2 py-0.5 text-brand">{f.label}</span>}</p>
                            <p className="mt-1 font-bold leading-snug">{o.title}</p>
                            <p className="mt-1 text-xs text-muted">{o.detail}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                {project.step === "script" && project.shots?.length ? (
                  <Storyboard key={JSON.stringify(project.shots)} shots={project.shots} busy={busy}
                    header={`Découpage · ${project.duration} s${project.format ? ` · ${project.format}` : ""} · ${project.product?.language ?? ""}`}
                    onSave={(shots) => act({ action: "editShots", shots })} onApprove={() => act({ action: "approve" })} />
                ) : project.step === "script" && project.script ? (
                  <div className="rounded-3xl border border-line bg-card p-5 shadow-sm">
                    <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{project.script}</p>
                    <button disabled={busy} onClick={() => act({ action: "approve" })}
                      className="mt-4 flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                      <Check size={15} /> Valider le script
                    </button>
                  </div>
                ) : null}

                {/* Étape vidéo */}
                {project.step === "video" && project.duration && (
                  <div className="space-y-3 rounded-3xl border border-line bg-card p-5 shadow-sm">
                    <p className="font-bold">Choisis le style de ta pub de {project.duration} s</p>
                    {project.suggestedReason && <p className="rounded-xl bg-accent/10 px-3 py-2 text-sm text-accent"><b>Awa conseille {styles.find((x) => x.id === project.suggestedStyle)?.name ?? "ce style"}</b> : {project.suggestedReason}</p>}
                    <div className="grid gap-2 sm:grid-cols-2">
                      {styles.map((s) => {
                        const o = s.options[project.duration!];
                        return (
                          <button key={s.id} onClick={() => setPicked(s.id)} disabled={!o}
                            className={`rounded-2xl border p-4 text-left transition disabled:opacity-40 ${picked === s.id && o ? "border-ink bg-bg ring-1 ring-ink" : "border-line hover:border-ink/40"}`}>
                            <span className="font-bold">{s.name}</span>
                            {project.suggestedStyle === s.id && <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">Conseillé</span>}
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
          <div className="px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-8 sm:pb-4">
            {photos.length > 0 && (
              <div className="mx-auto mb-2 flex max-w-3xl gap-2">
                {photos.map((u) => (
                  <div key={u} className="relative h-14 w-14 overflow-hidden rounded-xl border border-line">
                    <img src={u} alt="" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => setPhotos((p) => p.filter((x) => x !== u))} className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white" aria-label="Retirer"><X size={10} /></button>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); send(); }}
              className="mx-auto flex max-w-3xl items-end gap-2 rounded-3xl border border-line bg-card p-3 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.15)]">
              {intake ? (
                <label className="mb-1 flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm text-ink/80 hover:border-ink/40" title="Ajouter des photos du produit">
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && upload(e.target.files)} />
                  {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}<span className="hidden sm:inline">Photo</span>
                </label>
              ) : <Sparkles size={16} className="mb-2.5 ml-1 shrink-0 text-muted" />}
              <textarea ref={box} value={input} rows={1} disabled={busy}
                onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`; }}
                onFocus={() => setTimeout(() => bottom.current?.scrollIntoView({ block: "end" }), 300)}
                enterKeyHint="send"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={intake ? "Décris ton produit…" : customCreator ? "Ou décris un créateur sur mesure…" : project?.step === "script" && project.options?.length ? "Ou décris ta propre idée, Awa en fera un découpage…" : project?.step === "script" && project.shots ? "Ex : rends l'accroche plus drôle, ajoute un plan sur le prix…" : project?.options?.length ? "Ou décris ta propre idée…" : "Dis ce qu'il faut changer…"}
                className="max-h-40 min-h-[40px] w-full resize-none bg-transparent py-2 text-base outline-none placeholder:text-muted" />
              <button disabled={busy || uploading || (!input.trim() && !photos.length)} className="flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
                <ArrowUp size={15} /> Envoyer
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
