"use client";

import * as React from "react";
import { X } from "lucide-react";

export function Dialog({
  open,
  onClose,
  title,
  children,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  width?: string;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal>
      <div className={`fade-up w-full ${width} max-h-[92vh] overflow-y-auto rounded-t-3xl bg-card shadow-2xl sm:rounded-3xl`}>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-card/95 px-5 py-4 backdrop-blur">
          <div className="text-base font-bold">{title}</div>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted hover:bg-hover hover:text-ink" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
