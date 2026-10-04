import { redirect } from "next/navigation";
import { getSession } from "@/lib/insforge";
import { SignInForm } from "@/components/AuthForms";

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  if ((await getSession()).user) redirect(next ?? "/tableau-de-bord");
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-6 text-3xl font-extrabold">Connexion</h1>
      {error === "google" && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">La connexion avec Google n&apos;a pas abouti. Réessaie ou utilise ton e-mail.</p>}
      <SignInForm next={next?.startsWith("/") ? next : undefined} />
    </div>
  );
}
