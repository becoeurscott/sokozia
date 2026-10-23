"use client";

import { Dialog } from "@/components/ui/Dialog";
import { AuthForm } from "./AuthForm";
import { useStudio } from "@/components/studio/StudioProvider";
import * as React from "react";

export function AuthModal() {
  const studio = useStudio();
  const [mode, setMode] = React.useState(studio.authMode);
  React.useEffect(() => setMode(studio.authMode), [studio.authMode, studio.dialog]);
  const open = studio.dialog === "auth";

  return (
    <Dialog open={open} onClose={studio.closeDialog} width="max-w-md" title={mode === "signup" ? "Crée ton compte gratuit" : "Content de te revoir"}>
      <p className="mb-4 text-sm text-muted">
        {mode === "signup" ? "Inscription gratuite. Tu payes seulement les vidéos que tu crées, par Mobile Money." : "Connecte-toi pour retrouver tes vidéos et tes crédits."}
      </p>
      <AuthForm
        mode={mode}
        onModeChange={setMode}
        onSuccess={async () => {
          await studio.refreshMe();
          studio.closeDialog();
          const cb = studio.onAuthed.current;
          studio.onAuthed.current = null;
          cb?.();
        }}
      />
    </Dialog>
  );
}
