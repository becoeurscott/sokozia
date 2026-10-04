"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChatRow, useChatActions } from "./ChatActions";

const STEP: Record<string, string> = {
  product: "Produit", creator: "Créateur", location: "Lieu", script: "Script", video: "Vidéo", done: "Terminé",
};

// Liste des projets du tableau de bord : ouvrir, renommer, supprimer.
export default function ProjectList({ initial }: { initial: { id: string; title: string; step: string; created_at: string }[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const chats = useChatActions(
    (id, title) => setItems((l) => l.map((x) => (x.id === id ? { ...x, title } : x))),
    (id) => setItems((l) => l.filter((x) => x.id !== id)),
  );
  if (!items.length) return <p className="py-6 text-center text-sm text-muted">Aucun projet. Clique sur « Créer une pub » pour commencer.</p>;
  return (
    <div className="divide-y divide-line">
      {chats.error && <p className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{chats.error}</p>}
      {items.map((c) => (
        <div key={c.id} className="flex items-center gap-2 py-1">
          <div className="min-w-0 flex-1">
            <ChatRow id={c.id} title={c.title} onOpen={() => router.push(`/studio?projet=${c.id}`)} rename={chats.rename} remove={chats.remove} />
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.step === "done" ? "bg-accent/10 text-accent" : "bg-bg text-muted"}`}>{STEP[c.step] ?? c.step}</span>
          <span className="hidden shrink-0 text-xs text-muted sm:inline">{new Date(c.created_at).toLocaleDateString("fr-FR")}</span>
        </div>
      ))}
    </div>
  );
}
