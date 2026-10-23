import "server-only";
import { getDb, now } from "../db";
import { getActor } from "../actors";
import { videoPrice, type Duration, type Style } from "../models";
import type { BriefContent, Generation, Message } from "../types";
import { videoProvider } from "../providers";
import type { CheckResult } from "../providers/types";
import { buildVideoPrompt } from "../agent/brief";
import { appUrl } from "../auth";
import { copyRemote } from "../storage";
import { consumeCredit, findUsableCredit, refundCredit } from "./credits";
import { SAMPLE_POSTER } from "../providers/mock";

const TERMINAL: Generation["status"][] = ["completed", "failed", "nsfw"];

export function isTerminal(g: Generation): boolean {
  return TERMINAL.includes(g.status);
}

export interface CreateInput {
  userId: string;
  threadId: string;
  briefMessage: Message;
  brief: BriefContent;
  style: Style;
  duration: Duration;
  actorId: string;
  script: string;
}

/**
 * Creates the generation row. If a credit covers it, the job is submitted
 * right away; otherwise it waits for payment (status awaiting_payment).
 */
export async function createGeneration(input: CreateInput): Promise<{ generation: Generation; paid: boolean }> {
  const db = await getDb();
  const actor = getActor(input.actorId) ?? getActor(input.brief.actorId)!;
  const prompt = buildVideoPrompt({ ...input.brief, script: input.script, duration: input.duration }, actor);
  const price = videoPrice(input.style, input.duration);

  const generation = await db.insert<Generation>("generations", {
    user_id: input.userId,
    thread_id: input.threadId,
    message_id: input.briefMessage.id,
    style: input.style,
    duration: input.duration,
    actor_id: actor.id,
    product: input.brief.product,
    product_image_url: input.brief.imageUrl ?? null,
    script: input.script,
    prompt,
    provider: videoProvider().name,
    provider_request_id: null,
    provider_status_url: null,
    status: "awaiting_payment",
    video_url: null,
    poster_url: null,
    error: null,
    credit_id: null,
    order_id: null,
    price,
    created_at: now(),
    updated_at: now(),
    started_at: null,
    completed_at: null,
    last_checked_at: null,
  });

  const credit = await findUsableCredit(input.userId, input.style);
  if (credit) {
    const used = await consumeCredit(credit);
    if (used) {
      const g = await db.update<Generation>("generations", generation.id, { credit_id: credit.id });
      const started = await submitGeneration(g ?? generation);
      return { generation: started, paid: true };
    }
  }
  return { generation, paid: false };
}

/** Sends the job to the video provider. Safe to call once per generation. */
export async function submitGeneration(generation: Generation): Promise<Generation> {
  const db = await getDb();
  if (generation.provider_request_id) return generation;
  const actor = getActor(generation.actor_id)!;
  const provider = videoProvider();
  const actorImageUrl = `${appUrl()}/actors/${actor.id}.jpg`;
  const webhookUrl = provider.name === "higgsfield" ? `${appUrl()}/api/webhooks/higgsfield` : null;
  try {
    const res = await provider.submit({ generation, actorImageUrl, productImageUrl: generation.product_image_url, webhookUrl });
    const updated = await db.update<Generation>("generations", generation.id, {
      provider: provider.name,
      provider_request_id: res.requestId,
      provider_status_url: res.statusUrl,
      status: "queued",
      started_at: now(),
      updated_at: now(),
      last_checked_at: now(),
    });
    return updated ?? generation;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return (await failGeneration(generation, message)) ?? generation;
  }
}

/**
 * Refreshes a non-terminal generation from the provider when it hasn't
 * been checked in the last 2 s. Webhooks normally land first; this is the
 * fallback that keeps the UI moving even if they don't.
 */
export async function syncGeneration(generation: Generation): Promise<Generation> {
  if (isTerminal(generation) || generation.status === "awaiting_payment" || !generation.provider_request_id) return generation;
  const last = generation.last_checked_at ? Date.parse(generation.last_checked_at) : 0;
  if (Date.now() - last < 2000) return generation;
  const db = await getDb();
  await db.update<Generation>("generations", generation.id, { last_checked_at: now() });
  let result: CheckResult;
  try {
    result = await videoProvider().check(generation);
  } catch {
    return generation;
  }
  return applyResult(generation, result);
}

/** Applies a provider status (from polling or a webhook) idempotently. */
export async function applyResult(generation: Generation, result: CheckResult): Promise<Generation> {
  const db = await getDb();
  if (isTerminal(generation)) return generation;
  if (result.status === "completed" && result.videoUrl) {
    return (await completeGeneration(generation, result.videoUrl)) ?? generation;
  }
  if (result.status === "failed" || result.status === "nsfw") {
    return (await failGeneration(generation, result.error ?? "La génération a échoué.", result.status)) ?? generation;
  }
  if (result.status !== generation.status) {
    return (await db.update<Generation>("generations", generation.id, { status: result.status, updated_at: now() })) ?? generation;
  }
  return generation;
}

async function completeGeneration(generation: Generation, providerUrl: string): Promise<Generation | null> {
  const db = await getDb();
  let videoUrl = providerUrl;
  let posterUrl: string | null = generation.provider === "mock" ? `${appUrl()}${SAMPLE_POSTER}` : null;
  if (generation.provider === "higgsfield") {
    // Higgsfield output URLs expire after a week: keep our own copy.
    try {
      videoUrl = await copyRemote("outputs", `${generation.user_id}/${generation.id}.mp4`, providerUrl);
    } catch {
      videoUrl = providerUrl;
    }
    posterUrl = null;
  }
  return db.update<Generation>("generations", generation.id, {
    status: "completed",
    video_url: videoUrl,
    poster_url: posterUrl,
    completed_at: now(),
    updated_at: now(),
  });
}

async function failGeneration(generation: Generation, error: string, status: "failed" | "nsfw" = "failed"): Promise<Generation | null> {
  const db = await getDb();
  if (generation.credit_id) await refundCredit(generation.credit_id);
  return db.update<Generation>("generations", generation.id, { status, error, updated_at: now(), completed_at: now() });
}

export function publicGeneration(g: Generation) {
  const { prompt: _prompt, provider_status_url: _s, ...rest } = g;
  void _prompt;
  void _s;
  return rest;
}
