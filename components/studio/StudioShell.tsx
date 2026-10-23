"use client";

import * as React from "react";
import { Menu } from "lucide-react";
import { StudioProvider, useStudio } from "./StudioProvider";
import { Sidebar } from "./Sidebar";
import { TemplatesPanel, TemplatesToggle } from "./TemplatesPanel";
import { AuthModal } from "@/components/auth/AuthModal";
import { LibraryDialog } from "./LibraryDialog";
import { DocsDialog } from "./DocsDialog";
import { ActorsDialog } from "./ActorsPicker";
import { Logo } from "@/components/ui/Logo";
import type { User } from "@/lib/types";

export function StudioShell({ initialUser, children }: { initialUser: User | null; children: React.ReactNode }) {
  return (
    <StudioProvider initialUser={initialUser}>
      <Frame>{children}</Frame>
    </StudioProvider>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  const studio = useStudio();
  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      <Sidebar />
      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex items-center justify-between gap-2 border-b border-line bg-bg/90 px-3 py-2 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <button onClick={() => studio.setSidebarOpen(true)} className="rounded-lg p-2 hover:bg-hover" aria-label="Menu">
              <Menu className="h-5 w-5" />
            </button>
            <Logo href="/studio" size="sm" />
          </div>
          <div className="flex items-center gap-2">
            <TemplatesToggle />
            {!studio.user && (
              <button onClick={() => studio.openDialog("auth", { authMode: "signup" })} className="h-9 rounded-pill bg-ink px-3 text-sm font-semibold text-white">
                S&apos;inscrire
              </button>
            )}
          </div>
        </header>
        {/* Desktop top-right */}
        <div className="pointer-events-none absolute right-4 top-3 z-20 hidden md:block">
          <div className="pointer-events-auto">
            <TemplatesToggle />
          </div>
        </div>
        <div className="flex min-h-0 flex-1">
          <main className="relative flex min-w-0 flex-1 flex-col">{children}</main>
          <TemplatesPanel />
        </div>
      </div>
      <AuthModal />
      <LibraryDialog />
      <DocsDialog />
      <ActorsDialog
        open={studio.dialog === "actors"}
        onClose={studio.closeDialog}
        selected={studio.draft.actorId}
        onSelect={(a) => studio.setDraft((d) => ({ ...d, actorId: a.id }))}
      />
    </div>
  );
}
