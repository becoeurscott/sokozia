import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MobileTables } from "@/components/admin/MobileTables";
import { AdminNav } from "@/components/admin/AdminNav";
import { currentAdmin } from "@/lib/admin";
import { getSession } from "@/lib/insforge";

export const metadata: Metadata = { title: "Admin — Sokozia", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Back-office plein écran (recouvre l'en-tête du site), thème sombre.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getSession();
  if (!user) redirect("/admin-connexion");
  const admin = await currentAdmin();
  if (!admin) {
    return (
      <main className="fixed inset-0 z-[60] grid place-items-center bg-black px-6 text-center text-white">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">403</p>
          <h1 className="mt-2 text-2xl font-semibold">Accès réservé aux administrateurs</h1>
          <p className="mt-2 text-sm text-white/60">Ce compte n&apos;a pas les droits administrateur.</p>
          <div className="mt-6 flex justify-center gap-2">
            <Link href="/admin-connexion" className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black">Changer de compte</Link>
            <Link href="/tableau-de-bord" className="rounded-full border border-white/15 px-4 py-2 text-sm">Retour à l&apos;app</Link>
          </div>
        </div>
      </main>
    );
  }
  return (
    <div className="admin-root fixed inset-0 z-[60] overflow-y-auto bg-[#0a0a0a] text-white lg:p-3">
      <MobileTables />
      <div className="flex min-h-dvh overflow-hidden bg-black lg:min-h-[calc(100dvh-24px)] lg:rounded-[22px] lg:border lg:border-white/[0.06]">
        <AdminNav admin={{ name: admin.name, email: admin.email }} />
        <div className="min-w-0 flex-1 px-4 pb-24 pt-4 sm:px-6 lg:pb-8">{children}</div>
      </div>
    </div>
  );
}
