"use client";

import { useState } from "react";
import BuyButton from "./BuyButton";

type PlanPrice = { plan: string; videos: number; total: string; perVideo: string; saving: number };

export type PriceRow = {
  id: string; name: string; description: string;
  byDuration: { duration: number; plans: PlanPrice[] }[];
};

const META: Record<string, { title: string; tag?: string; hint: string }> = {
  single: { title: "À l'unité", hint: "Pour tester une idée" },
  pack5: { title: "Pack 5 vidéos", tag: "Le plus choisi", hint: "Pour une campagne complète" },
  monthly: { title: "Abonnement mensuel", tag: "Meilleur prix", hint: "Pour publier chaque semaine" },
};

export default function PricingPicker({ rows, loggedIn }: { rows: PriceRow[]; loggedIn: boolean }) {
  const [id, setId] = useState(rows[1]?.id ?? rows[0]?.id);
  const [duration, setDuration] = useState(rows[0]?.byDuration[0]?.duration ?? 15);
  const row = rows.find((r) => r.id === id) ?? rows[0];
  if (!row) return null;
  const current = row.byDuration.find((d) => d.duration === duration) ?? row.byDuration[0];
  const plans = current.plans;
  const dur = current.duration;
  return (
    <div className="mt-10">
      {row.byDuration.length > 1 && <div className="mx-auto mb-3 flex w-fit gap-1 rounded-full border border-line bg-card p-1">
        {row.byDuration.map((d) => (
          <button key={d.duration} onClick={() => setDuration(d.duration)}
            className={`rounded-full px-6 py-2.5 text-sm font-bold transition ${d.duration === dur ? "bg-brand text-white" : "text-muted hover:text-ink"}`}>
            Pub de {d.duration} secondes
          </button>
        ))}
      </div>}
      <div className="mx-auto grid w-full max-w-2xl grid-cols-4 gap-1 rounded-full border border-line bg-card p-1">
        {rows.map((r) => (
          <button key={r.id} onClick={() => setId(r.id)}
            className={`truncate rounded-full px-1 py-2.5 text-xs font-semibold sm:px-4 sm:text-sm transition ${r.id === row.id ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>
            {r.name}
          </button>
        ))}
      </div>
      <p className="mt-4 text-center text-muted">{row.description} · pub verticale de {row.byDuration.map((d) => d.duration).join(" ou ")} s</p>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {plans.map((p) => {
          const m = META[p.plan];
          const featured = p.plan === "pack5";
          return (
            <div key={p.plan} className={`relative flex flex-col rounded-3xl border p-6 ${featured ? "border-brand bg-ink text-white shadow-xl md:-translate-y-3" : "border-line bg-card"}`}>
              {m.tag && <span className={`absolute -top-3 left-6 rounded-full px-3 py-1 text-xs font-bold ${featured ? "bg-brand text-white" : "bg-accent text-white"}`}>{m.tag}</span>}
              <p className="text-lg font-bold">{m.title}</p>
              <p className={`text-sm ${featured ? "text-white/70" : "text-muted"}`}>{m.hint}</p>
              <p className="mt-6 text-4xl font-extrabold tracking-tight">{p.total}</p>
              <p className={`mt-1 text-sm ${featured ? "text-white/70" : "text-muted"}`}>
                {p.videos} pub{p.videos > 1 ? "s" : ""}{p.videos > 1 && <> · soit <b className={featured ? "text-white" : "text-ink"}>{p.perVideo}</b> / pub</>}
                {p.plan === "monthly" && " · 30 jours"}
              </p>
              {p.saving > 0 && <p className="mt-3 w-fit rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-accent">Tu économises {p.saving} %</p>}
              <div className="mt-6 flex-1" />
              <BuyButton plan={p.plan} styleId={row.id} duration={dur} loggedIn={loggedIn} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
