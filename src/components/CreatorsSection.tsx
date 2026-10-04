"use client";

import Link from "next/link";
import { useState } from "react";
import { Play } from "lucide-react";
import { CREATORS, creatorFiles } from "@/content/creators";

// Section « Nos créateurs » de la page d'accueil : portrait, pays, spécialité et présentation vidéo.
export default function CreatorsSection() {
  const [playing, setPlaying] = useState<string>();
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <p className="text-center text-sm font-bold uppercase tracking-widest text-brand">Nos créateurs</p>
      <h2 className="mt-2 text-center text-3xl font-extrabold sm:text-4xl">{CREATORS.length} visages africains pour présenter ton produit</h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-muted">
        Choisis la personne qui parle à tes clients. Son visage reste le même dans toutes tes pubs.
      </p>
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {CREATORS.map((c) => {
          const f = creatorFiles(c.id);
          return (
            <button key={c.id} onClick={() => setPlaying(playing === c.id ? undefined : c.id)}
              className="group overflow-hidden rounded-2xl border border-line bg-card text-left">
              <div className="relative aspect-[3/4] bg-ink">
                {playing === c.id
                  ? <video src={f.intro} poster={f.portrait} autoPlay playsInline onEnded={() => setPlaying(undefined)} className="h-full w-full object-cover" />
                  : <img src={f.portrait} alt={`${c.name}, créatrice UGC`} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />}
                {playing !== c.id && (
                  <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
                    <Play size={10} fill="white" /> Écouter
                  </span>
                )}
              </div>
              <div className="p-2.5">
                <p className="text-sm font-bold leading-tight">{c.name}</p>
                <p className="text-[11px] text-muted">{c.country}</p>
                <p className="mt-0.5 truncate text-[11px] font-semibold text-accent">{c.specialty}</p>
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-8 text-center"><Link href="/inscription" className="btn">Choisir mon créateur</Link></p>
    </section>
  );
}
