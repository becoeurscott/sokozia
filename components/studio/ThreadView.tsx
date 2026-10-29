"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import type { BriefContent, Generation, Message, Thread } from "@/lib/types";
import { useStudio, type Draft, EMPTY_DRAFT } from "./StudioProvider";
import { Composer } from "./Composer";
import { BriefCard, savedCountry, savedMethod, type LaunchInput } from "./BriefCard";
import { VideoCard } from "./VideoCard";
import { Spinner } from "@/components/ui/Spinner";

type Pub = Omit<Generation, "prompt" | "provider_status_url">;

interface ThreadData {
  thread: Thread;
  messages: Message[];
  generations: Pub[];
}

const ACTIVE: Generation["status"][] = ["queued", "in_progress", "awaiting_payment"];

export function ThreadView({ threadId }: { threadId: string }) {
  const studio = useStudio();
  const router = useRouter();
  const [data, setData] = React.useState<ThreadData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<Draft>(EMPTY_DRAFT);
  const [sending, setSending] = React.useState(false);
  const [launching, setLaunching] = React.useState<string | null>(null);
  const [retrying, setRetrying] = React.useState<string | null>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  const load = React.useCallback(async () => {
    try {
      const d = await api<ThreadData>(`/api/threads/${threadId}`);
      setData(d);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }, [threadId]);

  React.useEffect(() => {
    if (studio.ready && !studio.user) {
      studio.openDialog("auth", { authMode: "login", onAuthed: load });
      return;
    }
    load();
  }, [load, studio.ready, studio.user, studio]);

  // Poll active generations (2.5 s) until they settle.
  const activeIds = React.useMemo(() => (data?.generations ?? []).filter((g) => ACTIVE.includes(g.status)).map((g) => g.id), [data]);
  React.useEffect(() => {
    if (activeIds.length === 0) return;
    let stop = false;
    const tick = async () => {
      for (const id of activeIds) {
        try {
          const { generation } = await api<{ generation: Pub }>(`/api/generations/${id}`);
          if (stop) return;
          setData((d) => (d ? { ...d, generations: d.generations.map((g) => (g.id === id ? generation : g)) } : d));
        } catch {
          /* retry next tick */
        }
      }
    };
    const t = setInterval(tick, 2500);
    tick();
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [activeIds, studio]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [data?.messages.length, data?.generations.length]);

  async function send(d: Draft) {
    setSending(true);
    try {
      const { messages } = await api<{ messages: Message[] }>(`/api/threads/${threadId}/messages`, {
        method: "POST",
        json: { text: d.text, imageUrl: d.imageUrl, actorId: d.actorId },
      });
      setData((cur) => (cur ? { ...cur, messages: [...cur.messages, ...messages] } : cur));
      setDraft(EMPTY_DRAFT);
      studio.refreshThreads();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSending(false);
    }
  }

  async function launch(message: Message, input: LaunchInput) {
    setLaunching(message.id);
    try {
      const res = await api<{ generation: Pub; message: Message; redirectUrl: string }>("/api/generations", {
        method: "POST",
        json: { messageId: message.id, ...input },
      });
      setData((cur) =>
        cur
          ? {
              ...cur,
              messages: cur.messages.map((m) => (m.id === message.id ? { ...m, content: { ...m.content, ...input, generationId: res.generation.id } } : m)).concat(res.message),
              generations: [...cur.generations, res.generation],
            }
          : cur,
      );
      window.location.href = res.redirectUrl;
      return;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLaunching(null);
    }
  }

  async function retry(g: Pub) {
    setRetrying(g.id);
    try {
      const res = await api<{ generation: Pub; message: Message }>(`/api/generations/${g.id}/retry`, { method: "POST" });
      setData((cur) => (cur ? { ...cur, messages: [...cur.messages, res.message], generations: [...cur.generations, res.generation] } : cur));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setRetrying(null);
    }
  }

  async function pay(g: Pub) {
    try {
      const { redirectUrl } = await api<{ redirectUrl: string }>("/api/orders/single", { method: "POST", json: { generationId: g.id, country: savedCountry(), method: savedMethod() } });
      window.location.href = redirectUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted">
        {error ? (
          <div className="text-center">
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={() => router.push("/studio")} className="mt-3 text-sm font-semibold text-brand hover:underline">
              Retour
            </button>
          </div>
        ) : (
          <Spinner className="h-6 w-6" />
        )}
      </div>
    );
  }

  const gens = new Map(data.generations.map((g) => [g.id, g]));
  // A failed attempt can be retried only if no later attempt exists on the same order.
  const retriedOrders = new Set<string>();
  const byOrder = new Map<string, Pub[]>();
  for (const g of data.generations) if (g.order_id) byOrder.set(g.order_id, [...(byOrder.get(g.order_id) ?? []), g]);
  for (const [orderId, list] of byOrder) list.slice(0, -1).forEach((g) => retriedOrders.add(orderId + ":" + g.id));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="hidden items-center border-b border-line px-6 py-3 md:flex">
        <h2 className="truncate pr-40 text-sm font-semibold text-ink/80">{data.thread.title}</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin md:px-8">
        <div className="mx-auto flex max-w-[760px] flex-col gap-5">
          {data.messages.map((m) => {
            if (m.role === "user") {
              const c = m.content as { text?: string; imageUrl?: string | null };
              return (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-[15px] leading-relaxed text-white">
                    {c.imageUrl && !/\.(mp4|mov|webm)$/i.test(c.imageUrl) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.imageUrl} alt="" className="mb-2 max-h-56 rounded-xl object-cover" />
                    )}
                    {c.text}
                  </div>
                </div>
              );
            }
            if (m.kind === "brief") {
              const brief = m.content as unknown as BriefContent;
              return (
                <div key={m.id} className="flex items-start gap-3">
                  <Awa />
                  <BriefCard brief={brief} busy={launching === m.id} locked={Boolean(brief.generationId)} onLaunch={(input) => launch(m, input)} />
                </div>
              );
            }
            if (m.kind === "video") {
              const c = m.content as { generationId: string; text?: string };
              const g = gens.get(c.generationId);
              return (
                <div key={m.id} className="flex items-start gap-3">
                  <Awa />
                  <div className="min-w-0 flex-1">
                    {c.text && <p className="mb-2 text-[15px] text-ink/90">{c.text}</p>}
                    {g ? (
                      <VideoCard
                        generation={g}
                        retrying={retrying === g.id}
                        onPay={() => pay(g)}
                        onRetry={g.order_id && !retriedOrders.has(g.order_id + ":" + g.id) ? () => retry(g) : undefined}
                        onRemake={() => setDraft({ ...EMPTY_DRAFT, text: "Refais une variante de cette vidéo avec une accroche différente" })}
                      />
                    ) : null}
                  </div>
                </div>
              );
            }
            const c = m.content as { text?: string };
            return (
              <div key={m.id} className="flex items-start gap-3">
                <Awa />
                <p className="text-[15px] leading-relaxed">{c.text}</p>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="border-t border-line bg-bg/80 px-4 pb-4 pt-3 backdrop-blur md:px-8">
        <div className="mx-auto max-w-[760px]">
          <Composer draft={draft} setDraft={setDraft} onSubmit={send} busy={sending} compact label="Envoyer" placeholder="Précise, change le créateur, la durée, le ton…" />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function Awa() {
  return (
    <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-extrabold text-white" title="Awa, directrice de création">
      A
    </span>
  );
}
