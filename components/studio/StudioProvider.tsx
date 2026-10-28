"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import type { Thread, User } from "@/lib/types";

export type DialogName = "auth" | "library" | "docs" | "actors" | null;

export interface Draft {
  text: string;
  imageUrl: string | null;
  imageName: string | null;
  actorId: string | null;
}

export const EMPTY_DRAFT: Draft = { text: "", imageUrl: null, imageName: null, actorId: null };

interface StudioState {
  user: User | null;
  threads: Thread[];
  ready: boolean;
  dialog: DialogName;
  authMode: "login" | "signup";
  openDialog: (d: DialogName, opts?: { authMode?: "login" | "signup"; onAuthed?: () => void }) => void;
  closeDialog: () => void;
  refreshMe: () => Promise<User | null>;
  refreshThreads: () => Promise<void>;
  signOut: () => Promise<void>;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  templatesOpen: boolean;
  setTemplatesOpen: (v: boolean) => void;
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  /** Called by the auth modal once signed in. */
  onAuthed: React.MutableRefObject<(() => void) | null>;
}

const Ctx = React.createContext<StudioState | null>(null);

export function useStudio(): StudioState {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useStudio outside StudioProvider");
  return v;
}

export function StudioProvider({ initialUser, children }: { initialUser: User | null; children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = React.useState<User | null>(initialUser);
  const [threads, setThreads] = React.useState<Thread[]>([]);
  const [ready, setReady] = React.useState(false);
  const [dialog, setDialog] = React.useState<DialogName>(null);
  const [authMode, setAuthMode] = React.useState<"login" | "signup">("signup");
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const [templatesOpen, setTemplatesOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft>(EMPTY_DRAFT);
  const onAuthed = React.useRef<(() => void) | null>(null);

  const refreshMe = React.useCallback(async () => {
    try {
      const data = await api<{ user: User | null }>("/api/auth/me");
      setUser(data.user);
      return data.user;
    } catch {
      return null;
    }
  }, []);

  const refreshThreads = React.useCallback(async () => {
    if (!user) {
      setThreads([]);
      return;
    }
    try {
      const data = await api<{ threads: Thread[] }>("/api/threads");
      setThreads(data.threads);
    } catch {
      /* ignore */
    }
  }, [user]);

  React.useEffect(() => {
    refreshMe().finally(() => setReady(true));
  }, [refreshMe]);

  React.useEffect(() => {
    refreshThreads();
  }, [refreshThreads]);

  React.useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("sokozia.sidebar") === "collapsed");
    } catch {
      /* ignore */
    }
  }, []);

  const setCollapsedPersist = React.useCallback((v: boolean) => {
    setCollapsed(v);
    try {
      localStorage.setItem("sokozia.sidebar", v ? "collapsed" : "open");
    } catch {
      /* ignore */
    }
  }, []);

  const openDialog = React.useCallback<StudioState["openDialog"]>((d, opts) => {
    if (opts?.authMode) setAuthMode(opts.authMode);
    onAuthed.current = opts?.onAuthed ?? null;
    setDialog(d);
  }, []);

  const closeDialog = React.useCallback(() => setDialog(null), []);

  const signOut = React.useCallback(async () => {
    await api("/api/auth/logout", { method: "POST" });
    setUser(null);
    setThreads([]);
    router.push("/studio");
    router.refresh();
  }, [router]);

  const value: StudioState = {
    user,
    threads,
    ready,
    dialog,
    authMode,
    openDialog,
    closeDialog,
    refreshMe,
    refreshThreads,
    signOut,
    sidebarOpen,
    setSidebarOpen,
    collapsed,
    setCollapsed: setCollapsedPersist,
    templatesOpen,
    setTemplatesOpen,
    draft,
    setDraft,
    onAuthed,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
