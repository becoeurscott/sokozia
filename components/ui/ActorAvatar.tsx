"use client";

import * as React from "react";
import { actorColor, type Actor } from "@/lib/actors";

/** Portrait from /actors/<id>.jpg with an initials fallback until it exists. */
export function ActorAvatar({ actor, size = 40, className = "", rounded = "rounded-full" }: { actor: Actor; size?: number; className?: string; rounded?: string }) {
  const [failed, setFailed] = React.useState(false);
  const ref = React.useRef<HTMLImageElement>(null);
  const bg = actorColor(actor);
  const style: React.CSSProperties = { width: size, height: size, minWidth: size };

  // The 404 can fire before hydration, so check the element state too.
  React.useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) {
    return (
      <div className={`${rounded} flex items-center justify-center font-extrabold text-ink/80 ${className}`} style={{ ...style, background: bg, fontSize: size * 0.4 }} aria-label={actor.name}>
        {actor.name.charAt(0)}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={ref} src={`/actors/${actor.id}.jpg`} alt="" width={size} height={size} className={`${rounded} object-cover ${className}`} style={{ ...style, background: bg }} onError={() => setFailed(true)} />
  );
}
