"use client";

import { useEffect, useRef } from "react";

// Affiche la couverture, ne charge et ne joue la vidéo que lorsqu'elle est visible (économise les données mobiles).
export default function LazyVideo({ src, poster, label }: { src: string; poster?: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        if (!v.src) v.src = src;
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    }, { threshold: 0.5 });
    io.observe(v);
    return () => io.disconnect();
  }, [src]);
  return <video ref={ref} poster={poster} muted loop playsInline preload="none" aria-label={label} className="h-full w-full object-cover" />;
}
