import type { ReactNode } from "react";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 leading-relaxed [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-5 [&_h3]:font-semibold [&_li]:mt-1 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6">
      <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-muted">Dernière mise à jour : {updated}</p>
      {children}
    </article>
  );
}
