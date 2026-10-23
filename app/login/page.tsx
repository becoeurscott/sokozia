import { Suspense } from "react";
import { AuthPage } from "@/components/auth/AuthPage";

export const metadata = { title: "Connexion · Sokozia" };

export default function LoginPage() {
  return (
    <Suspense>
      <AuthPage mode="login" />
    </Suspense>
  );
}
