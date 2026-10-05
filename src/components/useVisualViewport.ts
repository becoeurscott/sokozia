"use client";

import { useEffect, useState } from "react";

// Zone réellement visible de l'écran (sans le clavier). Sur iPhone, le clavier ne réduit pas la page :
// on suit window.visualViewport pour garder le champ de saisie juste au-dessus du clavier.
export function useVisualViewport() {
  const [vv, setVv] = useState<{ height: number; top: number } | null>(null);
  useEffect(() => {
    const v = window.visualViewport;
    if (!v) return;
    const update = () => setVv({ height: v.height, top: v.offsetTop });
    update();
    v.addEventListener("resize", update);
    v.addEventListener("scroll", update);
    // La page sous le studio ne doit pas défiler (sinon iOS décale tout quand le clavier s'ouvre).
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      v.removeEventListener("resize", update);
      v.removeEventListener("scroll", update);
      html.style.overflow = prev;
    };
  }, []);
  return vv;
}
