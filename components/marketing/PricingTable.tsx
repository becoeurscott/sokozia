"use client";

import * as React from "react";
import Link from "next/link";
import { STYLE_ORDER, STYLES, formatFcfa, videoPrice, DURATIONS, type Style, type Duration } from "@/lib/models";
import { PACKS, PACK_ORDER, packPrice, packUnitPrice } from "@/lib/pricing";

export function PricingTable() {
  const [style, setStyle] = React.useState<Style>("naturel");
  const [duration, setDuration] = React.useState<Duration>(15);
  const spec = STYLES[style];

  return (
    <div className="mt-8">
      <div className="flex flex-wrap gap-2">
        {STYLE_ORDER.map((s) => (
          <button key={s} onClick={() => setStyle(s)} className={`h-10 rounded-pill border px-4 text-sm font-semibold transition ${s === style ? "border-brand bg-brand text-white" : "border-line bg-card hover:bg-hover"}`}>
            {STYLES[s].name}
          </button>
        ))}
      </div>
      <p className="mt-3 text-muted">
        {spec.description} · pub verticale de{" "}
        {DURATIONS.map((d, i) => (
          <React.Fragment key={d}>
            <button onClick={() => setDuration(d)} className={`font-semibold ${d === duration ? "text-brand underline" : "hover:text-ink"}`}>
              {d} s
            </button>
            {i < DURATIONS.length - 1 ? " / " : ""}
          </React.Fragment>
        ))}
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {PACK_ORDER.map((k) => {
          const pack = PACKS[k];
          const total = k === "single" ? videoPrice(style, duration) : packPrice(style, k);
          const unit = k === "single" ? total : packUnitPrice(style, k);
          return (
            <div key={k} className={`relative rounded-2xl border p-6 ${pack.badge ? "border-brand bg-card shadow-[0_20px_60px_-30px_rgba(232,89,12,.5)]" : "border-line bg-card"}`}>
              {pack.badge && <span className="absolute -top-3 left-5 rounded-pill bg-brand px-3 py-1 text-xs font-bold text-white">{pack.badge}</span>}
              <div className="text-lg font-extrabold">{pack.name}</div>
              <div className="text-sm text-muted">{pack.subtitle}</div>
              <div className="mt-5 text-3xl font-extrabold">{formatFcfa(total)}</div>
              <div className="mt-1 text-sm text-muted">
                {pack.videos} pub{pack.videos > 1 ? "s" : ""}
                {pack.videos > 1 && ` · soit ${formatFcfa(unit)} / pub`}
                {pack.validityDays && ` · ${pack.validityDays} jours`}
              </div>
              {pack.discount > 0 && <div className="mt-2 inline-block rounded-pill bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">Tu économises {Math.round(pack.discount * 100)} %</div>}
              <Link href={k === "single" ? "/studio" : "/studio/modeles"} className={`mt-6 flex h-11 items-center justify-center rounded-pill text-sm font-semibold transition ${pack.badge ? "bg-brand text-white hover:bg-[#d24f0a]" : "border border-line hover:bg-hover"}`}>
                {k === "single" ? "Créer ma vidéo" : "Payer"}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
