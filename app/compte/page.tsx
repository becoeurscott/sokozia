import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { WalletPanel } from "@/components/account/WalletPanel";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mon compte · Sokozia" };

export default async function ComptePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/compte");

  return (
    <main className="min-h-dvh bg-bg">
      <header className="border-b border-line bg-bg/85">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Logo href="/studio" />
          <div className="flex items-center gap-2">
            {isAdmin(user) && (
              <Button href="/admin" variant="soft" size="sm">
                Admin
              </Button>
            )}
            <Button href="/studio" variant="outline" size="sm">
              ← Retour au studio
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-3xl font-extrabold">Mon compte</h1>
        <p className="mt-1 text-muted">
          {user.name ? `${user.name} · ` : ""}
          {user.email}
        </p>
        <WalletPanel />
      </div>
    </main>
  );
}
