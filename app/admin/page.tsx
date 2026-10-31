import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { AdminCredit } from "@/components/admin/AdminCredit";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Sokozia", robots: { index: false } };

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!isAdmin(user)) notFound();

  return (
    <main className="min-h-dvh bg-bg">
      <header className="border-b border-line bg-bg/85">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Logo href="/studio" />
          <Button href="/compte" variant="outline" size="sm">
            Mon compte
          </Button>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-3xl font-extrabold">Admin</h1>
        <p className="mt-1 text-muted">Ajoute du crédit sur le solde d&apos;un client. Il l&apos;utilise ensuite avec « Mon solde » pour payer ses vidéos.</p>
        <AdminCredit />
      </div>
    </main>
  );
}
