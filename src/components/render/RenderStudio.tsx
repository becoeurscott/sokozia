"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Clapperboard, Clock, Download, ImagePlus, Loader2, RectangleVertical, RotateCcw, Sparkles, X } from "lucide-react";
import { Pick } from "./Pick";
import { AvatarPick, type AvatarCard } from "./AvatarPick";
import { RenderLoading } from "./RenderLoading";

export type DirectorCard = { id: string; name: string; hint: string };
export type ModelCard = { id: string; name: string; quality: string; description: string; durations: number[]; aspects: string[]; eta: number; sample: string | null };
export type Recent = { id: string; status: string; url: string | null; image: string | null; aspect: string; prompt: string; created_at: string };

const ASPECTS: Record<string, string> = { "9:16": "Vertical · TikTok, Reels, WhatsApp", "16:9": "Paysage · YouTube, Facebook", "1:1": "Carré · Instagram, Facebook" };
const nf = (n: number) => n.toLocaleString("fr-FR");

async function shrink(file: File): Promise<Blob> {
  if (file.size < 900_000) return file;
  const img = await createImageBitmap(file);
  const s = Math.min(1, 1600 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return new Promise((ok) => c.toBlob((b) => ok(b ?? file), "image/jpeg", 0.85));
}

export default function RenderStudio({ models, directors, avatars, balance: initialBalance, currency, isAdmin, name, recent: initialRecent }: {
  models: ModelCard[]; directors: DirectorCard[]; avatars: AvatarCard[]; balance: number; currency: string; isAdmin: boolean; name: string; recent: Recent[];
}) {
  const [balance, setBalance] = useState(initialBalance);
  const [recent, setRecent] = useState(initialRecent);
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [modelId, setModelId] = useState(models[0]?.id ?? "");
  const model = models.find((m) => m.id === modelId) ?? models[0];
  const [duration, setDuration] = useState(model?.durations.includes(10) ? 10 : model?.durations[0] ?? 5);
  const [aspect, setAspect] = useState("9:16");
  const [director, setDirector] = useState("sonnet");
  const [creator, setCreator] = useState("auto");
  const [prices, setPrices] = useState<Record<number, number>>({});
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState<{ id: string | null; image: string; aspect: string; eta: number; startedAt: number; note: string; hook?: string } | null>(null);
  const [done, setDone] = useState<{ url: string; aspect: string } | null>(null);
  const setTopup = (t: { need?: number } | null) => { if (t) window.dispatchEvent(new CustomEvent("sz:topup", { detail: t.need })); };
  const file = useRef<HTMLInputElement>(null);

  // Durée/format toujours valides pour le modèle choisi.
  useEffect(() => {
    if (!model) return;
    if (!model.durations.includes(duration)) setDuration(model.durations.includes(10) ? 10 : model.durations[0]);
    if (!model.aspects.includes(aspect)) setAspect(model.aspects[0]);
  }, [model, duration, aspect]);

  // Prix de chaque durée pour ce modèle + format (coût réel du modèle × la marge, réglée dans settings.margin).
  useEffect(() => {
    if (!model) return;
    let live = true;
    setPrices({});
    Promise.all(model.durations.map((d) =>
      fetch(`/api/render?model=${model.id}&duration=${d}&aspect=${encodeURIComponent(aspect)}&director=${director}&creator=${creator}`).then((r) => r.json()).then((j) => [d, j.price as number] as const).catch(() => [d, 0] as const),
    )).then((rows) => live && setPrices(Object.fromEntries(rows.filter(([, p]) => p > 0))));
    return () => { live = false; };
  }, [model, aspect, director, creator]);

  const price = prices[duration];
  const missing = price && !isAdmin ? Math.max(0, price - balance) : 0;
  const ready = !!image && !!price && !busy && !uploading;

  async function pick(files: FileList | null) {
    const f = files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    setError(undefined); setUploading(true);
    try {
      const body = new FormData();
      body.append("file", new File([await shrink(f)], "produit.jpg", { type: "image/jpeg" }));
      const r = await fetch("/api/upload", { method: "POST", body }).then((r) => r.json());
      if (!r.url) throw new Error(r.error ?? "Envoi impossible.");
      setImage(r.url);
    } catch (e) { setError((e as Error).message); }
    finally { setUploading(false); if (file.current) file.current.value = ""; }
  }

  async function generate() {
    if (!ready || !model) return;
    if (missing > 0) return setTopup({ need: missing });
    setBusy(true); setError(undefined); setDone(null);
    const dname = directors.find((d) => d.id === director)?.name ?? "Claude";
    // L'écran de rendu démarre tout de suite : Claude réalise la pub, puis le modèle la tourne.
    setJob({ id: null, image: image!, aspect, eta: model.eta + 20, startedAt: Date.now(), note: `${dname} réalise ta pub…` });
    const r = await fetch("/api/render", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl: image, prompt, duration, aspect, model: model.id, director, creator }) })
      .then((r) => r.json()).catch(() => ({ error: "Connexion perdue." }));
    setBusy(false);
    if (!r.videoId) {
      setJob(null);
      if (r.needTopup) return setTopup({ need: Math.max(0, (r.price ?? price) - balance) });
      return setError(r.error ?? "La création n'a pas pu démarrer.");
    }
    if (!isAdmin) setBalance((b) => b - price);
    setJob((j) => j && { ...j, id: r.videoId, eta: j.eta + (r.creator ? 60 : 0), note: `${r.creator ? `${r.creator} · ` : ""}« ${r.style} » · ${r.director} (${r.signature})`, hook: r.hook ?? undefined });
    setRecent((l) => [{ id: r.videoId, status: "processing", url: null, image, aspect, prompt, created_at: new Date().toISOString() }, ...l]);
  }

  // Suivi du rendu en cours.
  const poll = useCallback(async () => {
    if (!job?.id) return;
    const r = await fetch(`/api/render?id=${job.id}`).then((r) => r.json()).catch(() => null);
    if (!r) return;
    if (r.status === "ready" && r.url) {
      setDone({ url: r.url, aspect: job.aspect }); setJob(null);
      setRecent((l) => l.map((v) => (v.id === job.id ? { ...v, status: "ready", url: r.url } : v)));
    } else if (r.status === "failed") {
      setJob(null);
      setError("La vidéo n'a pas pu être créée. Ton solde a été remboursé, tu peux relancer.");
      if (!isAdmin && price) setBalance((b) => b + price);
      setRecent((l) => l.map((v) => (v.id === job.id ? { ...v, status: "failed" } : v)));
    }
  }, [job, isAdmin, price]);
  useEffect(() => { if (!job?.id) return; const t = setInterval(poll, 5000); return () => clearInterval(t); }, [job, poll]);

  const reset = () => { setDone(null); setJob(null); setPrompt(""); setImage(null); setError(undefined); };
  const balanceLabel = useMemo(() => `${nf(balance)} ${currency}`, [balance, currency]);

  // Le menu, le solde et la recharge sont dans le cadre commun (AppShell) : on lui parle par événements.
  useEffect(() => { window.dispatchEvent(new CustomEvent("sz:balance", { detail: balance })); }, [balance]);
  useEffect(() => { window.addEventListener("sz:new-video", reset); return () => window.removeEventListener("sz:new-video", reset); });

  return (
    <>
        <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-10 sm:pt-[18vh]">
          {job ? (
            <RenderLoading image={job.image} aspect={job.aspect} etaSec={job.eta} startedAt={job.startedAt} note={job.note} hook={job.hook} />
          ) : done ? (
            <div className="mx-auto w-full max-w-2xl text-center">
              <video src={done.url} controls autoPlay playsInline className="mx-auto block max-h-[65vh] max-w-full rounded-3xl bg-black shadow-2xl" />
              <div className="mt-4 flex justify-center gap-2">
                <a href={done.url} download className="flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white"><Download size={16} /> Télécharger</a>
                <button onClick={reset} className="flex items-center gap-2 rounded-full border border-line bg-card px-5 py-3 text-sm font-semibold"><RotateCcw size={16} /> Nouvelle vidéo</button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-center font-serif text-3xl tracking-tight sm:text-4xl">Pour quel produit on fait une pub ?</h1>

              <div className="mt-8 rounded-[22px] border border-line bg-card px-4 pb-3 pt-4 shadow-[0_10px_40px_-18px_rgba(29,26,22,.25)] transition focus-within:border-brand/50"
                onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files); }}>
                {image && (
                  <div className="mb-2 flex">
                    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-bg py-1 pl-1 pr-2 text-xs font-medium">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image} alt="Produit" className="h-7 w-7 rounded-full object-cover" />
                      Photo du produit
                      <button onClick={() => setImage(null)} className="text-muted hover:text-ink" aria-label="Retirer la photo"><X size={14} /></button>
                    </span>
                  </div>
                )}
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2} maxLength={1500}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generate(); } }}
                  placeholder="Facultatif : ce que tu veux mettre en avant (prix, promo, langue…). Sinon Claude décide de tout."
                  className="block min-h-12 w-full resize-none bg-transparent text-[16px] leading-6 outline-none placeholder:text-muted/70" />
                <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files)} />
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="grid min-w-0 grid-cols-3 gap-1.5 sm:-ml-1 sm:flex sm:flex-wrap sm:items-center sm:gap-0.5">
                    <button type="button" onClick={() => file.current?.click()} title="Ajouter la photo du produit" aria-label="Ajouter la photo du produit"
                      className={`flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-full bg-[#f6ebdc]/70 px-1.5 text-[13px] font-medium hover:bg-[#f6ebdc] sm:justify-start sm:text-sm sm:bg-transparent sm:px-2.5 ${image ? "text-ink/75" : "text-brand"}`}>
                      {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}<span className="truncate">{image ? "Photo ✓" : "Photo"}</span>
                    </button>
                    <AvatarPick value={creator} avatars={avatars} onChange={setCreator} />
                    <Pick title="Directeur de la pub" icon={<Clapperboard size={16} />} value={director} onChange={setDirector}
                      options={directors.map((d) => ({ value: d.id, label: d.name, short: d.name.replace("Claude ", ""), hint: d.hint }))} />
                    <Pick title="Modèle" icon={<Sparkles size={16} />} value={modelId} onChange={setModelId}
                      options={models.map((m) => ({ value: m.id, label: m.name, hint: m.quality }))} />
                    <Pick title="Durée" icon={<Clock size={16} />} value={String(duration)} onChange={(v) => setDuration(Number(v))}
                      options={(model?.durations ?? []).map((d) => ({ value: String(d), label: `${d} s`, hint: prices[d] ? `${nf(prices[d])} ${currency}` : undefined }))} />
                    <Pick title="Format" icon={<RectangleVertical size={16} />} value={aspect} onChange={setAspect}
                      options={(model?.aspects ?? []).map((a) => ({ value: a, label: a, hint: ASPECTS[a] }))} />
                  </div>
                  <button onClick={generate} disabled={!ready} className="flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-brand pl-4 pr-3 sm:ml-auto sm:h-10 sm:w-auto text-sm font-semibold text-white transition hover:brightness-110 disabled:bg-brand/40">
                    {busy ? <Loader2 size={15} className="animate-spin" /> : null}
                    {missing > 0 ? "Recharger" : "Générer"}{price ? ` · ${nf(price)}` : ""} <ArrowUp size={15} />
                  </button>
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-muted">
                {!image ? "Ajoute la photo de ton produit : c'est elle qui garantit que la vidéo montre ton vrai produit."
                  : isAdmin ? "Admin : génération gratuite" : `Solde : ${balanceLabel}${missing > 0 ? ` · il manque ${nf(missing)} ${currency}` : ""}`}
              </p>
            </>
          )}
          {error && <p className="mx-auto mt-4 max-w-md rounded-xl bg-red-50 px-4 py-3 text-center text-sm text-red-700">{error}</p>}

          {recent.length > 0 && (
            <section className="mt-12">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bold">Mes dernières vidéos</h2>
                <Link href="/mes-videos" className="text-sm font-semibold text-brand">Tout voir</Link>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {recent.slice(0, 8).map((v) => (
                  <button key={v.id} onClick={() => v.url && setDone({ url: v.url, aspect: v.aspect })} className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-ink text-left">
                    {v.url ? <video src={v.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                      : v.image ? (/* eslint-disable-next-line @next/next/no-img-element */ <img src={v.image} alt="" className="h-full w-full object-cover opacity-50 blur-[2px]" />) : null}
                    <span className="absolute inset-x-2 bottom-2 rounded-full bg-black/60 px-2 py-1 text-center text-[11px] font-semibold text-white">
                      {v.status === "ready" ? "Prête" : v.status === "failed" ? "Échouée · remboursée" : "En création…"}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
    </>
  );
}
