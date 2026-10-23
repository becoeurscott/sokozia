import { redirect } from "next/navigation";
import { getSession } from "@/lib/insforge";
import { SignUpForm } from "@/components/AuthForms";

export default async function Page() {
  if ((await getSession()).user) redirect("/studio");
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-2 text-3xl font-extrabold">Crée ton compte</h1>
      <p className="mb-6 text-muted">Gratuit. Tu payes seulement les vidéos que tu crées.</p>
      <SignUpForm />
    </div>
  );
}
