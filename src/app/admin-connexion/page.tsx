import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminSignIn } from "@/components/admin/AdminSignIn";
import { currentAdmin } from "@/lib/admin";

export const metadata: Metadata = { title: "Connexion admin — Sokozia", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLogin() {
  if (await currentAdmin()) redirect("/admin");
  return (
    <main className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-black px-5 text-white">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-xl bg-[#f08a3c] text-lg font-black text-black">S</span>
          <span className="leading-tight">
            <span className="block font-semibold">Sokozia</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f08a3c]">Administration</span>
          </span>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-[#121212] p-5">
          <h1 className="text-lg font-semibold">Connexion administrateur</h1>
          <p className="mb-5 mt-1 text-[13px] text-white/45">Réservé aux comptes administrateurs de Sokozia.</p>
          <AdminSignIn />
        </div>
      </div>
    </main>
  );
}
