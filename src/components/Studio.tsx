"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUp, Clapperboard, Film, ImagePlus, LayoutGrid, Menu, MessageSquare, Plus, Sparkles, Wallet, X,
} from "lucide-react";

type Style = { id: string; name: string; description: string; options: Record<number, { price: string; remaining: number } | undefined> };
type PackLeft = { label: string; remaining: number };
type Msg = { role: "user" | "assistant"; content: string };
type Brief = { title: string; script_fr: string; suggested_style: string; duration_s?: number };
type Conv = { id: string; title: string; created_at: string };

const CHIPS = ["Mon restaurant", "Ma boutique de mode", "Une crème beauté", "Mon appartement à louer"];
const TASKS = ["Pub pour une promo du week-end", "Témoignage d'une cliente", "Déballage d'un produit"];

function Orb({ size = 56 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="shrink-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,#ffd8b0,#f08a3c_45%,#c2410c_80%)] shadow-[0_8px_30px_-6px_rgba(232,89,12,0.55)]"
    />
  );
}

function groupLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const days = Math.floor((new Date(today.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000);
  return days === 0 ? "Aujourd'hui" : days === 1 ? "Hier" : "Plus ancien";
}

export default function Studio({ conversations, styles: initialStyles, durations, packs, isAdmin, firstName }: {
  conversations: Conv[]; styles: Style[]; durations: number[]; packs: PackLeft[]; isAdmin: boolean; firstName: string;
}) {
  const [styles, setStyles] = useState(initialStyles);
  const [convs, setConvs] = useState(conversations);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [conversationId, setConversationId] = useState<string>();
  const [brief, setBrief] = useState<Brief | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<string>();
  const [duration, setDuration] = useState(durations[0] ?? 15);
  const [usedPass, setUsedPass] = useState<{ style: string; duration: number } | null>(null);
  const [image, setImage] = useState<string>();
  const [error, setError] = useState<string>();
  const [video, setVideo] = useState<{ id: string; status: string; url?: string }>();
  const [menu, setMenu] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const empty = messages.length === 0;

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, brief, video]);

  useEffect(() => {
    if (!video || video.status !== "processing") return;
    const t = setInterval(async () => {
      const r = await fetch(`/api/videos/${video.id}`).then((r) => r.json()).catch(() => null);
      if (r && r.status !== "processing") setVideo({ id: video.id, status: r.status, url: r.url });
      if (r?.status === "failed" && usedPass) adjust(usedPass.style, usedPass.duration, +1);
    }, 8000);
    return () => clearInterval(t);
  }, [video, usedPass]);

  function adjust(styleId: string, d: number, delta: number) {
    setStyles((ss) => ss.map((s) => s.id !== styleId || !s.options[d] ? s : { ...s, options: { ...s.options, [d]: { ...s.options[d]!, remaining: s.options[d]!.remaining + delta } } }));
  }

  function reset() {
    setMessages([]); setConversationId(undefined); setBrief(null); setPicked(undefined);
    setImage(undefined); setVideo(undefined); setError(undefined); setMenu(false);
  }

  async function open(id: string) {
    setMenu(false);
    const r = await fetch(`/api/conversations/${id}`).then((r) => r.json()).catch(() => null);
    if (!r?.messages) return;
    reset();
    setConversationId(id);
    setMessages(r.messages);
    if (r.brief) { setBrief(r.brief); setPicked(r.brief.suggested_style); if (durations.includes(r.brief.duration_s)) setDuration(r.brief.duration_s); }
  }

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setError(undefined);
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setBusy(true);
    const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId, message: text }) })
      .then((r) => r.json()).catch(() => ({ error: "Connexion perdue. Réessaie." }));
    setBusy(false);
    if (r.conversationId && r.conversationId !== conversationId) {
      setConversationId(r.conversationId);
      setConvs((c) => c.some((x) => x.id === r.conversationId) ? c : [{ id: r.conversationId, title: text.slice(0, 40), created_at: new Date().toISOString() }, ...c]);
    }
    if (r.error) return setError(r.error);
    setMessages((m) => [...m, { role: "assistant", content: r.reply }]);
    if (r.brief) {
      setBrief(r.brief);
      setPicked((p) => p ?? r.brief.suggested_style);
      if (durations.includes(r.brief.duration_s)) setDuration(r.brief.duration_s);
      setConvs((c) => c.map((x) => (x.id === r.conversationId ? { ...x, title: r.brief.title } : x)));
    }
  }

  async function upload(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/upload", { method: "POST", body: fd }).then((r) => r.json()).catch(() => ({}));
    if (r.url) setImage(r.url); else setError(r.error ?? "Envoi impossible.");
  }

  async function generate() {
    const style = styles.find((s) => s.id === picked);
    if (!style || !conversationId) return;
    setError(undefined);
    setBusy(true);
    const r = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId, styleId: style.id, duration, imageUrl: image }) })
      .then((r) => r.json()).catch(() => ({ error: "Connexion perdue." }));
    setBusy(false);
    if (r.error) return setError(r.error);
    if (!isAdmin) { adjust(style.id, duration, -1); setUsedPass({ style: style.id, duration }); }
    setVideo({ id: r.videoId, status: "processing" });
  }

  async function buy(styleId: string) {
    setBusy(true);
    const r = await fetch("/api/pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: "single", styleId, duration, conversationId, imageUrl: image }) })
      .then((r) => r.json()).catch(() => ({ error: "Connexion perdue." }));
    setBusy(false);
    if (r.url) window.location.href = r.url; else setError(r.error);
  }

  const style = styles.find((s) => s.id === picked);
  const opt = style?.options[duration];
  const canCreate = !!opt && (isAdmin || opt.remaining > 0);
  const groups = convs.reduce<Record<string, Conv[]>>((g, c) => ((g[groupLabel(c.created_at)] ??= []).push(c), g), {});

  const sidebar = (
    <aside className="flex h-full w-72 flex-col border-r border-line bg-card">
      <div className="flex items-center justify-between px-5 pb-3 pt-5">
        <Link href="/" className="text-lg font-extrabold tracking-tight">Soko<span className="text-brand">zia</span></Link>
        <button onClick={() => setMenu(false)} className="rounded-lg p-1 text-muted lg:hidden" aria-label="Fermer"><X size={18} /></button>
      </div>
      <div className="px-4">
        <button onClick={reset} className="flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-90">
          <Plus size={16} /> Nouvelle vidéo <Sparkles size={14} />
        </button>
      </div>
      <nav className="mt-5 space-y-0.5 px-3 text-sm">
        <Link href="/mes-videos" className="flex items-center gap-3 rounded-xl px-3 py-2 text-muted hover:bg-bg hover:text-ink"><Film size={16} /> Mes vidéos</Link>
        <Link href="/tarifs" className="flex items-center gap-3 rounded-xl px-3 py-2 text-muted hover:bg-bg hover:text-ink"><LayoutGrid size={16} /> Styles & tarifs</Link>
      </nav>
      <div className="mt-5 flex-1 overflow-y-auto px-3">
        {Object.entries(groups).map(([label, items]) => (
          <div key={label} className="mb-4">
            <p className="px-3 pb-1 text-xs font-medium text-muted">{label}</p>
            {items.map((c) => (
              <button key={c.id} onClick={() => open(c.id)}
                className={`block w-full truncate rounded-xl px-3 py-2 text-left text-sm transition hover:bg-bg ${c.id === conversationId ? "bg-bg font-semibold" : "text-ink/80"}`}>
                {c.title}
              </button>
            ))}
          </div>
        ))}
        {!convs.length && <p className="px-3 text-sm text-muted">Tes projets apparaîtront ici.</p>}
      </div>
      <div className="m-4 rounded-2xl border border-line bg-bg p-4">
        <p className="flex items-center gap-2 text-xs text-muted"><Wallet size={14} /> Mes pubs restantes</p>
        {packs.length ? (
          <ul className="mt-2 space-y-1 text-sm">
            {packs.map((p) => <li key={p.label} className="flex justify-between"><span>{p.label}</span><b>{p.remaining}</b></li>)}
          </ul>
        ) : <p className="mt-1 text-sm text-muted">Aucun pack. Tu peux payer pub par pub.</p>}
        <Link href="/tarifs" className="mt-3 flex items-center justify-center rounded-full border border-line bg-card py-2 text-sm font-semibold hover:border-brand">Acheter un pack</Link>
      </div>
    </aside>
  );

  return (
    <div className="fixed inset-0 z-40 flex bg-[#f6f5f3]">
      <div className="hidden lg:block">{sidebar}</div>
      {menu && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {sidebar}
          <button className="flex-1 bg-black/30" onClick={() => setMenu(false)} aria-label="Fermer le menu" />
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <div className="flex items-center gap-2">
            <button onClick={() => setMenu(true)} className="rounded-lg p-2 lg:hidden" aria-label="Menu"><Menu size={20} /></button>
            <p className="font-bold">Studio</p>
            <span className="rounded-md border border-line bg-card px-1.5 py-0.5 text-[10px] font-semibold text-muted">Awa</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/mes-videos" className="hidden items-center gap-2 rounded-full border border-line bg-card px-4 py-2 text-sm font-medium sm:flex">
              Mes vidéos <Film size={14} />
            </Link>
            <button onClick={reset} className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
              Nouvelle vidéo <Sparkles size={14} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 sm:px-8">
          <div className="mx-auto max-w-3xl pb-6">
            {empty ? (
              <div className="flex flex-col items-center pt-10 text-center sm:pt-16">
                <Orb size={64} />
                <h1 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl">Salut{firstName ? `, ${firstName}` : ""}</h1>
                <p className="mt-2 text-muted">Dis-moi ce que tu vends, je m&apos;occupe de la pub.</p>

                <div className="mt-10 grid w-full gap-3 text-left sm:grid-cols-3">
                  <div className="flex flex-col justify-between rounded-2xl bg-ink p-5 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs text-white/70"><Orb size={18} /> Awa</span>
                      <span className="rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-semibold">Directrice UGC</span>
                    </div>
                    <p className="mt-6 text-sm leading-relaxed">Je t&apos;aide à écrire le script, choisir le personnage et créer une pub qui vend.</p>
                  </div>
                  <div className="rounded-2xl border border-line bg-card p-4">
                    {TASKS.map((t) => (
                      <button key={t} onClick={() => send(t)} className="flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left text-[13px] hover:text-brand">
                        <Clapperboard size={14} className="shrink-0 text-muted" /> {t}
                      </button>
                    ))}
                    <p className="mt-2 border-t border-line pt-2 text-[11px] text-muted">Idées de pubs</p>
                  </div>
                  <button onClick={() => send("Quelle pub marche le mieux pour vendre sur WhatsApp et TikTok ?")}
                    className="flex flex-col justify-between rounded-2xl border border-line bg-card p-4 text-left hover:border-brand">
                    <p className="text-sm font-semibold leading-snug">Quelle pub marche le mieux pour vendre sur WhatsApp et TikTok ?</p>
                    <p className="mt-4 border-t border-line pt-2 text-[11px] text-muted">Question suggérée</p>
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {CHIPS.map((c) => (
                    <button key={c} onClick={() => send(c)}
                      className="flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2 text-sm text-ink/80 shadow-sm hover:border-brand">
                      <MessageSquare size={14} className="text-brand" /> {c}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-5 pt-4">
                {messages.map((m, i) => (
                  m.role === "assistant" ? (
                    <div key={i} className="flex gap-3">
                      <Orb size={30} />
                      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tl-md border border-line bg-card px-4 py-3 text-[15px] leading-relaxed shadow-sm">{m.content}</div>
                    </div>
                  ) : (
                    <div key={i} className="flex justify-end">
                      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-md bg-ink px-4 py-3 text-[15px] leading-relaxed text-white">{m.content}</div>
                    </div>
                  )
                ))}
                {busy && !brief && (
                  <div className="flex items-center gap-3"><Orb size={30} /><span className="flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 120}ms` }} />)}</span></div>
                )}

                {brief && !video && (
                  <div className="space-y-4 rounded-3xl border border-line bg-card p-5 shadow-sm">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-accent">Ton script</p>
                      <h2 className="mt-1 text-xl font-bold">{brief.title}</h2>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">{brief.script_fr}</p>
                      <p className="mt-2 text-xs text-muted">Pas satisfait ? Dis à Awa ce qu&apos;il faut changer.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
                      <p className="text-sm font-semibold">Durée</p>
                      <div className="flex gap-1 rounded-full border border-line bg-bg p-1">
                        {durations.map((d) => (
                          <button key={d} onClick={() => setDuration(d)}
                            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${d === duration ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>{d} s</button>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {styles.map((s) => {
                        const o = s.options[duration];
                        return (
                          <button key={s.id} onClick={() => setPicked(s.id)} disabled={!o}
                            className={`rounded-2xl border p-4 text-left transition disabled:opacity-40 ${picked === s.id && o ? "border-ink bg-bg ring-1 ring-ink" : "border-line hover:border-ink/40"}`}>
                            <div className="flex items-center justify-between">
                              <span className="font-bold">{s.name}</span>
                              {brief.suggested_style === s.id && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">Conseillé</span>}
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-muted">{s.description}</p>
                            <p className="mt-2 text-sm">{o ? <><b>{o.price}</b>{o.remaining > 0 && <span className="text-accent"> · {o.remaining} restante{o.remaining > 1 ? "s" : ""}</span>}</> : <>Disponible en {Object.keys(s.options).join(" / ")} s</>}</p>
                          </button>
                        );
                      })}
                    </div>

                    {style && !opt && <p className="text-sm text-muted">Ce style n&apos;existe pas en {duration} s. Change la durée ou le style.</p>}
                    {style && opt && (canCreate ? (
                      <button onClick={generate} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3.5 font-semibold text-white shadow-md hover:brightness-110 disabled:opacity-50">
                        <Sparkles size={16} /> {busy ? "Lancement…" : isAdmin ? `Créer la pub de ${duration} s (admin, gratuit)` : `Créer la pub de ${duration} s · 1 pub de ton pack`}
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <button onClick={() => buy(style.id)} disabled={busy} className="w-full rounded-full bg-brand py-3.5 font-semibold text-white shadow-md hover:brightness-110 disabled:opacity-50">
                          Payer {opt.price} et créer la pub
                        </button>
                        <p className="text-center text-xs text-muted">Paiement Mobile Money. La pub se crée automatiquement après confirmation.</p>
                        <Link href="/tarifs" className="block text-center text-sm font-semibold text-brand underline">ou économise avec un pack / abonnement</Link>
                      </div>
                    ))}
                  </div>
                )}

                {video && (
                  <div className="rounded-3xl border border-line bg-card p-6 text-center shadow-sm">
                    {video.status === "processing" && (<><div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-line border-t-brand" /><p className="font-semibold">Ta pub est en cours de création…</p><p className="mt-1 text-sm text-muted">Ça prend 5 à 15 minutes. Tu peux fermer la page, elle sera dans « Mes vidéos ».</p></>)}
                    {video.status === "ready" && video.url && (<><video src={video.url} controls playsInline className="mx-auto max-h-[70vh] rounded-2xl" /><div className="mt-4 flex justify-center gap-2"><a href={video.url} download className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white">Télécharger</a><button onClick={() => setVideo(undefined)} className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold">Une autre version</button></div></>)}
                    {video.status === "failed" && (<><p className="font-semibold">La pub n&apos;a pas pu être créée</p><p className="mt-1 text-sm text-muted">Elle ne t'a pas été décomptée. Réessaie ou change de style.</p><button onClick={() => setVideo(undefined)} className="mt-4 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white">Réessayer</button></>)}
                  </div>
                )}
              </div>
            )}
            {error && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            <div ref={bottom} />
          </div>
        </div>

        <div className="px-4 pb-4 sm:px-8">
          <form onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="mx-auto max-w-3xl rounded-3xl border border-line bg-card p-3 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.15)]">
            <div className="flex items-start gap-2 px-2 pt-1">
              <Sparkles size={16} className="mt-1 shrink-0 text-muted" />
              <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={2} disabled={busy}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder={empty ? "Décris ton produit ou ton idée de pub…" : "Réponds à Awa…"}
                className="max-h-40 min-h-[48px] w-full resize-none bg-transparent text-[15px] outline-none placeholder:text-muted" />
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm text-ink/80 hover:border-ink/40">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                <ImagePlus size={15} /> {image ? "Photo ajoutée" : "Photo produit"}
              </label>
              <button disabled={busy || !input.trim()} className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
                <ArrowUp size={15} /> Envoyer
              </button>
            </div>
          </form>
          <p className="mt-2 text-center text-[11px] text-muted">
            Les vidéos sont générées par IA, vérifie le script avant de créer. <Link href="/cgu" className="underline">Conditions d&apos;utilisation</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
