"use client";

import { useState } from "react";

/* Hand-written SVG charts for the admin dashboard (no chart library). */

export interface BarPoint { label: string; value: number; secondary?: number }

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(n);

/** Rounded "pill" bars on a full-height track, like the reference cash-flow chart. */
export function PillBars({ data, unit = "", height = 260, secondaryLabel, primaryLabel = "Valeur" }: { data: BarPoint[]; unit?: string; height?: number; primaryLabel?: string; secondaryLabel?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => Math.max(d.value, d.secondary ?? 0)));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));

  return (
    <div className="relative select-none" style={{ height }}>
      <div className="absolute inset-y-0 left-0 w-10 flex flex-col justify-between pb-7 text-[11px] text-white/45">
        {[...ticks].reverse().map((t) => <span key={t}>{compact(t)}</span>)}
      </div>
      <div className="absolute inset-0 left-10 pb-7">
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {ticks.map((t) => <div key={t} className="border-t border-dashed border-white/[0.06]" />)}
        </div>
        <div className="relative h-full flex items-end gap-[3px] sm:gap-1.5">
          {data.map((d, i) => (
            <div key={i} className="relative flex-1 h-full flex items-end justify-center" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <div className="absolute bottom-0 w-[70%] max-w-3 h-full rounded-full bg-white/[0.04]" />
              {d.secondary !== undefined && (
                <div className="absolute bottom-0 w-[70%] max-w-3 rounded-full bg-white/25 transition-all" style={{ height: `${(d.secondary / top) * 100}%` }} />
              )}
              <div
                className={`relative w-[70%] max-w-3 rounded-full transition-all ${hover === i ? "bg-[#f08a3c]" : "bg-white"}`}
                style={{ height: `${Math.max(d.value > 0 ? 3 : 0, (d.value / top) * 100)}%` }}
              />
              {hover === i && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap rounded-lg border border-white/10 bg-black/90 px-2.5 py-1.5 text-[11px] shadow-xl">
                  <p className="text-white/45">{d.label}</p>
                  <p className="font-semibold">{primaryLabel} : {fmt(d.value)}{unit}</p>
                  {d.secondary !== undefined && secondaryLabel && <p className="text-white/70">{secondaryLabel} : {fmt(d.secondary)}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-6">
          {data.map((d, i) => i % labelEvery === 0 && (
            <span key={i} className="absolute top-1 -translate-x-1/2 text-[11px] text-white/45 whitespace-nowrap" style={{ left: `${((i + 0.5) / data.length) * 100}%` }}>{d.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Small stepped block graphic used on KPI tiles (decorative, driven by real data). */
export function MiniBlocks({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(1, ...values);
  const v = values.length ? values : [0];
  return (
    <div className="flex items-end gap-[2px] h-10 w-24">
      {v.map((x, i) => (
        <div key={i} className="flex-1 rounded-[3px]" style={{ height: `${Math.max(12, (x / max) * 100)}%`, background: color, opacity: 0.35 + 0.65 * (x / max) }} />
      ))}
    </div>
  );
}

/** Progress ring (savings-goal style). */
export function Ring({ pct, color = "#f08a3c", size = 44 }: { pct: number; color?: string; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(p / 100) * c} ${c}`} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="rotate-90 origin-center fill-white text-[10px] font-semibold">{Math.round(p)}%</text>
    </svg>
  );
}

/** Horizontal share bars (spend by model, jobs by status). */
export function ShareBars({ items, unit = "" }: { items: { label: string; value: number; color?: string; hint?: string }[]; unit?: string }) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  return (
    <div className="space-y-3">
      {items.map((i) => (
        <div key={i.label}>
          <div className="flex items-baseline justify-between text-[13px]">
            <span className="text-white/70 truncate">{i.label}</span>
            <span className="font-medium tabular-nums">{fmt(i.value)}{unit}{i.hint && <span className="text-white/45 font-normal"> · {i.hint}</span>}</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-white/[0.05] overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(i.value / total) * 100}%`, background: i.color ?? "#f08a3c" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function niceTicks(max: number): number[] {
  const step0 = max / 4;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) ?? step0;
  return [0, 1, 2, 3, 4].map((i) => +(i * step).toFixed(6));
}

function compact(n: number) {
  return n >= 1000 ? `${fmt(n / 1000)}k` : fmt(n);
}
