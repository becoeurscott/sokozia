import { getSession } from "@/lib/insforge";
import { currencyOf } from "@/lib/pricing";
import { getWallet } from "@/lib/wallet";
import { signOut } from "../actions";
import AppShell from "@/components/app/AppShell";

// Pages connectées : même cadre partout (menu, solde, recharge). Chaque page gère la redirection vers la connexion.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getSession();
  if (!profile) return <>{children}</>;
  const wallet = await getWallet(profile.id);
  const c = currencyOf(profile.country);
  return (
    <AppShell name={profile.full_name} balance={wallet.balance} currency={c === "XOF" || c === "XAF" ? "FCFA" : c} isAdmin={profile.is_admin} signOut={signOut}>
      {children}
    </AppShell>
  );
}
