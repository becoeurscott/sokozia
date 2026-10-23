"use client";

import { useEffect, useState } from "react";

const STAGES = [
  "Analyse de ton produit",
  "Écriture de la scène",
  "Mise en place du décor",
  "Rendu des images",
  "Animation et mouvements",
  "Ajout du son",
  "Finalisation de la vidéo",
];

/** Écran de rendu affiché pendant que le modèle crée la vidéo. Progression estimée (jamais 100 % avant la fin). */
export function RenderLoading({ image, aspect, etaSec, startedAt }: { image: string; aspect: string; etaSec: number; startedAt: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(t); }, []);
  const elapsed = Math.max(0, (now - startedAt) / 1000);
  const pct = Math.min(96, 100 * (1 - Math.exp(-elapsed / (etaSec * 0.55))));
  const stage = STAGES[Math.min(STAGES.length - 1, Math.floor((pct / 96) * STAGES.length))];
  const ratio = aspect === "16:9" ? "aspect-video" : aspect === "1:1" ? "aspect-square" : "aspect-[9/16]";
  const w = aspect === "16:9" ? 16 / 9 : aspect === "1:1" ? 1 : 9 / 16;
  const mm = Math.floor(elapsed / 60), ss = Math.floor(elapsed % 60).toString().padStart(2, "0");

  return (
    <div className="mx-auto w-full max-w-2xl" role="status" aria-live="polite">
      <div className={`rl-frame relative mx-auto ${ratio} overflow-hidden rounded-3xl bg-ink shadow-2xl`} style={{ width: `min(100%, calc(60vh * ${w}))` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" className="rl-img absolute inset-0 h-full w-full object-cover" />
        <div className="rl-grid absolute inset-0" />
        <div className="rl-sweep absolute inset-0" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3 text-[11px] font-semibold uppercase tracking-widest text-white/80">
          <span className="flex items-center gap-1.5"><span className="rl-rec size-2 rounded-full bg-red-500" /> Rendu</span>
          <span>{mm}:{ss}</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-16 text-white">
          <p key={stage} className="rl-in text-sm font-semibold">{stage}…</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20">
            <div className="rl-bar h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-white/70">{Math.round(pct)} % · environ {Math.max(1, Math.round(etaSec / 60))} min au total</p>
        </div>
      </div>
      <p className="mx-auto mt-4 max-w-sm text-center text-sm text-muted">Tu peux quitter cette page : ta vidéo arrivera dans « Mes vidéos ».</p>
      <style>{`
        .rl-img{filter:blur(14px) saturate(1.2) brightness(.7);transform:scale(1.15);animation:rl-focus 8s ease-in-out infinite alternate}
        @keyframes rl-focus{to{filter:blur(6px) saturate(1.3) brightness(.85);transform:scale(1.05)}}
        .rl-grid{background-image:linear-gradient(rgba(255,255,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.07) 1px,transparent 1px);background-size:28px 28px;mask-image:radial-gradient(circle at 50% 45%,black,transparent 75%)}
        .rl-sweep{background:linear-gradient(180deg,transparent 0%,rgba(232,89,12,.0) 40%,rgba(255,170,90,.45) 50%,rgba(232,89,12,0) 60%,transparent 100%);background-size:100% 250%;animation:rl-scan 2.6s cubic-bezier(.45,0,.55,1) infinite;mix-blend-mode:screen}
        @keyframes rl-scan{from{background-position:0 120%}to{background-position:0 -20%}}
        .rl-rec{animation:rl-blink 1s steps(2) infinite}@keyframes rl-blink{50%{opacity:.2}}
        .rl-bar{background-image:linear-gradient(90deg,#e8590c,#ffb070,#e8590c);background-size:200% 100%;animation:rl-flow 1.4s linear infinite}
        @keyframes rl-flow{to{background-position:-200% 0}}
        .rl-in{animation:rl-up .4s ease-out}@keyframes rl-up{from{opacity:0;transform:translateY(6px)}}
        .rl-frame{box-shadow:0 30px 80px -30px rgba(232,89,12,.55)}
        @media (prefers-reduced-motion:reduce){.rl-img,.rl-sweep,.rl-bar,.rl-rec{animation:none}}
      `}</style>
    </div>
  );
}
