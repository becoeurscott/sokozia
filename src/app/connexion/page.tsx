import { redirect } from "next/navigation";
import { getSession } from "@/lib/insforge";
import { SignInForm } from "@/components/AuthForms";

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if ((await getSession()).user) redirect(next ?? "/studio");
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-6 text-3xl font-extrabold">Connexion</h1>
      <SignInForm next={next?.startsWith("/") ? next : undefined} />
    </div>
  );
}
