import { Suspense } from "react";
import { AuthPage } from "@/components/auth/AuthPage";

export const metadata = { title: "Inscription · Sokozia" };

export default function SignupPage() {
  return (
    <Suspense>
      <AuthPage mode="signup" />
    </Suspense>
  );
}
