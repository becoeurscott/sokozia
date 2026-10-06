"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Check, Film, FolderOpen, ImagePlus, LayoutGrid, Loader2, Plus, Sparkles, Wallet, X } from "lucide-react";
import type { ProjectState } from "@/lib/project";
import { ChatRow, useChatActions } from "./ChatActions";
import { useVisualViewport } from "./useVisualViewport";
import { CreatorPicks, FormatPicks, Generating, ImageStep, LocationPicks, PhotoPrompt, PreviewPanel, StylePicks, VideoReady, type StyleCard } from "./StudioSteps";

type PackLeft = { label: string; remaining: number };
type Conv = { id: string; title: string; created_at: string };

const STEPS = [
  ["product", "Produit"], ["creator", "Créateur"], ["format", "Format"], ["location", "Lieu"], ["style", "Style"], ["preview", "Aperçu"], ["video", "Vidéo"],
] as const;
const ORDER = ["product", "creator", "format", "location", "style", "preview", "video", "done"];
const SUGGESTIONS = ["Je vends une huile de karité", "Mon restaurant à Abidjan", "Ma boutique de perruques", "Des téléphones neufs"];

function Orb({ size = 56 }: { size?: number }) {
  return <div style={{ width: size, height: size }} className="shrink-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,#ffd8b0,#f08a3c_45%,#c2410c_80%)] shadow-[0_8px_30px_-6px_rgba(232,89,12,0.55)]" />;
}

function groupLabel(iso: string) {
  const days = Math.floor((new Date(new Date().toDateString()).getTime() - new Date(new Date(iso).toDateString()).getTime()) / 86400000);
  return days === 0 ? "Aujourd'hui" : days === 1 ? "Hier" : "Plus ancien";
}

const post = (url: string, body: unknown) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    .then((r) => r.json()).catch(() => ({ error: "Connexion perdue. Réessaie." }));

async function uploadFile(file: File): Promise<{ url?: string; error?: string }> {
  const fd = new FormData();
  fd.append("file", file);
  return fetch("/api/upload", { method: "POST", body: fd }).then((r) => r.json()).catch(() => ({ error: "Envoi impossible." }));
}

export default function Studio({ conversations, styles: initialStyles, packs, isAdmin, firstName, initialProjectId, initialProject }: {
  conversations: Conv[]; styles: StyleCard[]; packs: PackLeft[]; isAdmin: boolean; firstName: string; initialProjectId?: string; initialProject?: ProjectState;
}) {
  const [styles, setStyles] = useState(initialStyles);
  const [convs, setConvs] = useState(conversations);
  const [project, setProject] = useState<ProjectState | null>(initialProject ?? null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
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
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [project?.messages.length, project?.step, project?.video?.status, project?.styleId, project?.duration]);

  // Suivi des images et de la vidéo en cours.
  const waiting = !!project && (
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
    (id, title) => { setConvs((c) => c.map((x) => (x.id === id ? { ...x, title } : x))); setProject((p) => (p && p.id === id ? { ...p, title } : p)); },
    (id) => { setConvs((c) => c.filter((x) => x.id !== id)); if (project?.id === id) reset(); },
  );

  useEffect(() => {
    if (initialProjectId) open(initialProjectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProjectId]);

  function reset() {
    setProject(null); setError(undefined); setInput(""); setPhotos([]); setMenu(false);
  }

  async function open(id: string) {
    setMenu(false); setError(undefined);
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
    if (project.step === "creator" || project.step === "location") return act({ action: customCreator || project.options?.length ? "pick" : "revise", text });
    act({ action: "revise", text });
  }

  async function upload(files: FileList) {
    setUploading(true); setError(undefined);
    for (const file of Array.from(files).slice(0, 6 - photos.length)) {
      const r = await uploadFile(file);
      if (r.url) setPhotos((p) => [...p, r.url!]); else setError(r.error ?? "Envoi impossible.");
    }
    setUploading(false);
  }

  // Photos envoyées pendant la conversation produit : partent tout de suite à Awa.
  async function uploadAndSend(files: FileList) {
    setUploading(true); setError(undefined);
    const urls: string[] = [];
    for (const file of Array.from(files).slice(0, 6)) {
      const r = await uploadFile(file);
      if (r.url) urls.push(r.url); else setError(r.error ?? "Envoi impossible.");
    }
    setUploading(false);
    if (!urls.length) return;
    if (!project) { setPhotos((p) => [...p, ...urls]); return; }
    act({ action: "chat", text: "", photos: urls });
  }

  async function locationPhoto(file: File) {
    setUploading(true); setError(undefined);
    const r = await uploadFile(file);
    setUploading(false);
    if (!r.url) return setError(r.error ?? "Envoi impossible.");
    act({ action: "locationPhoto", url: r.url });
  }

  function adjust(styleId: string, d: number, delta: number) {
    setStyles((ss) => ss.map((s) => s.id !== styleId || !s.options[d] ? s : { ...s, options: { ...s.options, [d]: { ...s.options[d]!, remaining: s.options[d]!.remaining + delta } } }));
  }

  async function generate() {
    if (!project?.styleId || !project.duration) return;
    setBusy(true); setError(undefined);
    const r = await post("/api/generate", { conversationId: project.id, styleId: project.styleId });
    setBusy(false);
    if (r.error) return setError(r.error);
    if (!isAdmin) adjust(project.styleId, project.duration, -1);
    open(project.id);
  }

  async function buy() {
    if (!project?.styleId || !project.duration) return;
    setBusy(true);
    const r = await post("/api/pay", { plan: "single", styleId: project.styleId, duration: project.duration, conversationId: project.id });
    setBusy(false);
    if (r.url) window.location.href = r.url; else setError(r.error);
  }

  const groups = convs.reduce<Record<string, Conv[]>>((g, c) => ((g[groupLabel(c.created_at)] ??= []).push(c), g), {});
  const stepIndex = project ? ORDER.indexOf(project.step) : -1;
  const chosen = project?.styleId ? styles.find((s) => s.id === project.styleId) : undefined;
  const opt = chosen && project?.duration ? chosen.options[project.duration] : undefined;
  const canCreate = !!opt && (isAdmin || opt.remaining > 0);
  const composerOn = intake || customCreator || (!!project && ["creator", "location"].includes(project.step) && !!project.options?.length)
    || (!!project && (["product", "location"].includes(project.step) && project.images[project.step as "product" | "location"]?.status === "ready"))
    || project?.step === "preview";
  const placeholder = intake ? "Décris ton produit…"
    : project?.step === "creator" ? "Ou décris un créateur sur mesure…"
    : project?.step === "location" && project.options?.length ? "Ou décris ton lieu…"
    : project?.step === "preview" ? "Ex : rends l'accroche plus drôle, ajoute un plan sur le prix…"
    : "Dis ce qu'il faut changer…";

  const sidebar = (
    <aside className="flex h-full w-72 flex-col border-r border-line bg-card">
      <div className="flex items-center justify-between px-5 pb-3 pt-5">
        <p className="text-sm font-bold">Mes projets</p>
        <button onClick={() => setMenu(false)} className="rounded-lg p-1 text-muted lg:hidden" aria-label="Fermer"><X size={18} /></button>
      </div>
      <div className="px-4">
        <button onClick={reset} className="flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3 text-sm font-semibold text-white shadow-md hover:opacity-90"><Plus size={16} /> Nouvelle pub <Sparkles size={14} /></button>
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
            {items.map((c) => <ChatRow key={c.id} id={c.id} title={c.title} active={c.id === project?.id} onOpen={() => open(c.id)} rename={chats.rename} remove={chats.remove} />)}
          </div>
        ))}
        {!convs.length && <p className="px-3 text-sm text-muted">Tes projets apparaîtront ici.</p>}
        {chats.error && <p className="mx-3 mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{chats.error}</p>}
      </div>
      <div className="m-4 rounded-2xl border border-line bg-bg p-4">
        <p className="flex items-center gap-2 text-xs text-muted"><Wallet size={14} /> Mes pubs restantes</p>
        {packs.length ? <ul className="mt-2 space-y-1 text-sm">{packs.map((p) => <li key={p.label} className="flex justify-between"><span>{p.label}</span><b>{p.remaining}</b></li>)}</ul>
          : <p className="mt-1 text-sm text-muted">Aucun pack. Tu peux payer pub par pub.</p>}
        <Link href="/tarifs" className="mt-3 flex items-center justify-center rounded-full border border-line bg-card py-2 text-sm font-semibold hover:border-brand">Acheter un pack</Link>
      </div>
    </aside>
  );

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-30 flex bg-[#f6f5f3]" style={vv ? { top: vv.top + HEADER, height: vv.height - HEADER, bottom: "auto" } : undefined}>
      <div className="hidden lg:block">{sidebar}</div>
      {menu && <div className="fixed inset-0 z-50 flex lg:hidden">{sidebar}<button className="flex-1 bg-black/30" onClick={() => setMenu(false)} aria-label="Fermer le menu" /></div>}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <button onClick={() => setMenu(true)} className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold lg:hidden" aria-label="Mes projets"><FolderOpen size={14} /> Projets</button>
            <p className="truncate font-bold">{project?.title ?? "Nouvelle pub"}</p>
          </div>
          {project && (
            <ol className="hidden items-center gap-1 text-xs xl:flex">
              {STEPS.map(([k, l], i) => (
                <li key={k} className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-semibold ${i < stepIndex ? "text-accent" : i === stepIndex ? "bg-ink text-white" : "text-muted"}`}>
                  {i < stepIndex ? <Check size={12} /> : <span>{i + 1}</span>} {l}
                </li>
              ))}
            </ol>
          )}
        </header>
        {project && (
          <div className="px-4 pb-2 xl:hidden">
            <div className="flex gap-1">{STEPS.map(([k], i) => <div key={k} className={`h-1 flex-1 rounded-full ${i <= stepIndex ? "bg-ink" : "bg-line"}`} />)}</div>
            <p className="mt-1 text-xs text-muted">Étape {Math.min(stepIndex + 1, 7)}/7 · {STEPS[Math.min(stepIndex, 6)][1]}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 sm:px-8">
          <div className="mx-auto max-w-3xl pb-6">
            {!project ? (
              <div className="flex flex-col items-center pt-8 text-center">
                <Orb size={64} />
                <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">Salut{firstName ? `, ${firstName}` : ""}</h1>
                <p className="mt-2 max-w-md text-muted">Parle-moi de ton produit et envoie ses photos. Ensuite tu choisis le créateur, le format, le lieu et le style, en quelques clics.</p>
                <div className="mt-6 w-full max-w-md text-left"><PhotoPrompt onFiles={uploadAndSend} uploading={uploading} count={photos.length} /></div>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((t) => <button key={t} onClick={() => send(t)} disabled={busy} className="rounded-full border border-line bg-card px-4 py-2 text-sm shadow-sm hover:border-brand disabled:opacity-50">{t}</button>)}
                </div>
              </div>
            ) : (
              <div className="space-y-5 pt-2">
                {project.messages.map((m, i) => m.role === "assistant" ? (
                  <div key={i} className="flex gap-3"><Orb size={30} /><div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tl-md border border-line bg-card px-4 py-3 text-[15px] leading-relaxed shadow-sm">{m.content}</div></div>
                ) : (
                  <div key={i} className="flex justify-end"><div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-md bg-ink px-4 py-3 text-[15px] leading-relaxed text-white">{m.content}</div></div>
                ))}

                {/* 1. Produit */}
                {intake && !project.photos.length && <PhotoPrompt onFiles={uploadAndSend} uploading={uploading} count={0} />}
                {project.step === "product" && project.product && (
                  <ImageStep img={project.images.product} retriesLeft={project.retriesLeft} busy={busy} label="Ta fiche produit"
                    onApprove={() => act({ action: "approve" })} onRegenerate={() => act({ action: "regenerate" })} />
                )}

                {/* Images validées */}
                {stepIndex > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {(["product", "creator", "location"] as const).map((k) => {
                      const i = project.images[k];
                      return i?.approved && i.url ? (
                        <a key={k} href={i.url} target="_blank" className="overflow-hidden rounded-xl border border-line bg-card">
                          <img src={i.url} alt="" className="aspect-video w-full object-cover" />
                          <p className="px-2 py-1 text-[11px] font-semibold text-muted">{{ product: "Produit", creator: project.creatorName ?? "Créateur", location: project.locationName ?? "Lieu" }[k]}</p>
                        </a>
                      ) : null;
                    })}
                  </div>
                )}

                {/* 2. Créateur */}
                {project.step === "creator" && !project.images.creator && (
                  <CreatorPicks busy={busy} picks={(project.options ?? []).map((o) => ({ id: o.title, reason: o.detail }))} onPick={(id) => act({ action: "creator", creatorId: id })} />
                )}
                {project.step === "creator" && project.images.creator && (
                  <ImageStep img={project.images.creator} retriesLeft={project.retriesLeft} busy={busy} label="Ton créateur sur mesure"
                    onApprove={() => act({ action: "approve" })} onRegenerate={() => act({ action: "regenerate" })} />
                )}

                {/* 3. Format */}
                {project.step === "format" && (
                  <FormatPicks busy={busy} picks={(project.options ?? []).map((o) => ({ id: o.format ?? o.title, reason: o.detail }))} onPick={(id) => act({ action: "format", formatId: id })} />
                )}

                {/* 4. Lieu */}
                {project.step === "location" && project.options?.length ? (
                  <LocationPicks options={project.options} busy={busy} uploading={uploading} onPick={(i) => act({ action: "pick", index: i })} onPhoto={locationPhoto} />
                ) : null}
                {project.step === "location" && !project.options?.length && (
                  <ImageStep img={project.images.location} retriesLeft={project.retriesLeft} busy={busy} label="Ton lieu de tournage"
                    onApprove={() => act({ action: "approve" })} onRegenerate={() => act({ action: "regenerate" })} />
                )}

                {/* 5. Style, durée, prix */}
                {project.step === "style" && (
                  <StylePicks styles={styles} styleId={project.styleId} duration={project.duration} suggested={project.suggestedStyle} reason={project.suggestedReason} busy={busy}
                    onStyle={(id) => act({ action: "style", styleId: id })} onDuration={(d) => act({ action: "duration", duration: d })} onConfirm={() => act({ action: "confirm" })} />
                )}

                {/* 6. Aperçu */}
                {project.step === "preview" && (
                  <PreviewPanel project={project} busy={busy} onApprove={() => act({ action: "approve" })} onRegenerate={() => act({ action: "regenerate" })}
                    onEditShots={(shots) => act({ action: "editShots", shots })} onBack={() => act({ action: "again" })} />
                )}

                {/* 7. Vidéo */}
                {project.step === "video" && chosen && opt && project.duration && (
                  <div className="rounded-3xl bg-ink p-5 text-white shadow-lg">
                    <div className="flex gap-4">
                      {project.images.frame?.url && <img src={project.images.frame.url} alt="" className="hidden h-36 w-20 rounded-xl object-cover sm:block" />}
                      <div className="flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Prête à être créée</p>
                        <p className="mt-1 text-lg font-bold">Pub {chosen.name} · {project.duration} s · {project.creatorName}</p>
                        <p className="mt-2 text-3xl font-extrabold">{opt.price}</p>
                        {canCreate ? (
                          <button onClick={generate} disabled={busy} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3.5 font-semibold text-white disabled:opacity-50">
                            {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} {isAdmin ? "Créer la pub (admin, gratuit)" : `Créer la pub · 1 pub de ton pack (reste ${opt.remaining})`}
                          </button>
                        ) : (
                          <>
                            <button onClick={buy} disabled={busy} className="mt-4 w-full rounded-full bg-brand py-3.5 font-semibold text-white disabled:opacity-50">Payer {opt.price} et créer la pub</button>
                            <p className="mt-2 text-xs text-white/60">Paiement Mobile Money. La création démarre dès confirmation.</p>
                          </>
                        )}
                        <button onClick={() => act({ action: "again" })} disabled={busy} className="mt-3 text-xs text-white/60 underline">Changer de style ou de durée</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Génération / résultat */}
                {project.video && project.step === "done" && project.video.status === "processing" && <Generating startedAt={project.video.startedAt} frame={project.images.frame?.url ?? null} />}
                {project.video && project.step === "done" && project.video.status === "ready" && project.video.url && <VideoReady url={project.video.url} onAgain={() => act({ action: "again" })} />}
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
            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="mx-auto flex max-w-3xl items-end gap-2 rounded-3xl border border-line bg-card p-3 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.15)]">
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
                placeholder={placeholder}
                className="max-h-40 min-h-[40px] w-full resize-none bg-transparent py-2 text-base outline-none placeholder:text-muted" />
              <button disabled={busy || uploading || (!input.trim() && !photos.length)} className="flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"><ArrowUp size={15} /> Envoyer</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
