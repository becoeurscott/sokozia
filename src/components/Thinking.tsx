"use client";

import { useEffect, useState } from "react";

const PHRASES: Record<string, string[]> = {
  product: ["Awa réfléchit", "Awa lit ton message", "Awa prépare la suite"],
  creator: ["Awa cherche le bon visage", "Awa compare les créateurs", "Awa réfléchit"],
  format: ["Awa choisit le format", "Awa réfléchit"],
  location: ["Awa imagine le décor", "Awa repère les lieux", "Awa réfléchit"],
  style: ["Awa calcule ton prix", "Awa écrit le plan de tournage", "Awa réfléchit"],
  preview: ["Awa compose l'image", "Awa règle la lumière", "Awa peaufine les détails"],
};
const DEFAULT = ["Awa réfléchit", "Awa prépare la suite", "Encore un instant"];

/** Claude-style "working" indicator: a spinning, breathing spark + shimmering status text. */
export function Thinking({ step }: { step?: string }) {
  const phrases = (step && PHRASES[step]) || DEFAULT;
  const [i, setI] = useState(0);
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (secs && secs % 3 === 0) setI((n) => (n + 1) % phrases.length);
  }, [secs, phrases.length]);

  return (
    <div className="flex items-center gap-3" role="status" aria-live="polite">
      <svg viewBox="0 0 24 24" className="sk-spark h-7 w-7 text-brand" aria-hidden>
        {Array.from({ length: 8 }).map((_, k) => (
          <rect key={k} x="11" y="1.5" width="2" height="8" rx="1" fill="currentColor" transform={`rotate(${k * 45} 12 12)`} />
        ))}
      </svg>
      <span key={i} className="sk-shimmer sk-fade text-sm font-medium">{phrases[i]}…</span>
      {secs >= 5 && <span className="text-xs text-muted">{secs}s</span>}
      <style>{`
        .sk-spark{animation:sk-spin 2.4s linear infinite, sk-breathe 1.2s ease-in-out infinite}
        @keyframes sk-spin{to{transform:rotate(360deg)}}
        @keyframes sk-breathe{0%,100%{scale:.82;opacity:.75}50%{scale:1.05;opacity:1}}
        .sk-shimmer{background:linear-gradient(90deg,var(--color-muted,#8a8a8a) 0%,var(--color-ink,#111) 45%,var(--color-muted,#8a8a8a) 90%);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:sk-sweep 1.8s linear infinite}
        @keyframes sk-sweep{from{background-position:100% 0}to{background-position:-100% 0}}
        .sk-fade{animation:sk-sweep 1.8s linear infinite, sk-in .35s ease-out}
        @keyframes sk-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
        @media (prefers-reduced-motion:reduce){.sk-spark,.sk-shimmer,.sk-fade{animation:none}}
      `}</style>
    </div>
  );
}
