"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Sur téléphone, chaque ligne de tableau devient une carte : on copie le titre de colonne dans data-label.
export function MobileTables() {
  const path = usePathname();
  useEffect(() => {
    const label = () => document.querySelectorAll<HTMLTableElement>(".admin-root table").forEach((t) => {
      const heads = [...t.querySelectorAll("thead th")].map((th) => th.textContent?.trim() ?? "");
      t.querySelectorAll("tbody tr").forEach((tr) => [...tr.children].forEach((td, i) => {
        if (heads[i] && !td.hasAttribute("data-label")) td.setAttribute("data-label", heads[i]);
      }));
    });
    label();
    const mo = new MutationObserver(label);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [path]);
  return null;
}
