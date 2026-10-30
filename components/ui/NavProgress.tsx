"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

/**
 * Thin orange bar at the top of the screen while a page loads. Starts on
 * any internal link click and finishes once the new path renders.
 */
export function NavProgress() {
  const pathname = usePathname();
  const [state, setState] = React.useState<"idle" | "loading" | "done">("idle");
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
      setState("loading");
      // Never leave the bar stuck if the page never changes.
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setState("done"), 10_000);
    }
    // Capture phase: next/link calls preventDefault before a bubbling listener would run.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  React.useEffect(() => {
    setState((s) => (s === "loading" ? "done" : s));
  }, [pathname]);

  React.useEffect(() => {
    if (state !== "done") return;
    const t = setTimeout(() => setState("idle"), 400);
    return () => clearTimeout(t);
  }, [state]);

  if (state === "idle") return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]" aria-hidden>
      <div className={`nav-progress h-full bg-brand shadow-[0_0_10px_rgba(109,7,26,.6)] ${state === "done" ? "nav-progress-done" : ""}`} />
    </div>
  );
}
