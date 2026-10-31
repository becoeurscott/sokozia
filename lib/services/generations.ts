import "server-only";
import { getDb, now } from "../db";
import { actorSheetUrl, actorVoiceUrl, getActor, type Actor } from "../actors";
import { elevenVoiceId, speakLine } from "../providers/elevenlabs";
import { uploadToHiggsfield } from "../providers/higgsfield";
import { MAX_CLIP_SECONDS, clipCount, videoPrice, type Duration, type Style } from "../models";
import type { BriefContent, Generation, GenerationPart, Message, Order } from "../types";
import { videoProvider } from "../providers";
import type { CheckResult } from "../providers/types";
import { PROMPT_SEPARATOR, buildVideoPrompts } from "../agent/brief";
import { appUrl } from "../auth";
import { copyRemote, putFile } from "../storage";
import { concatClips } from "../video/concat";
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
 * Creates the generation row, waiting for payment. The caller then opens a
 * checkout for it (pay-per-video).
 */
export async function createGeneration(input: CreateInput): Promise<Generation> {
  const db = await getDb();
  const actor = getActor(input.actorId) ?? getActor(input.brief.actorId)!;
  const prompt = buildVideoPrompts({ ...input.brief, script: input.script, duration: input.duration }, actor).join(PROMPT_SEPARATOR);
  const price = videoPrice(input.duration);

  return db.insert<Generation>("generations", {
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
    parts: null,
    status: "awaiting_payment",
    video_url: null,
    poster_url: null,
    error: null,
    order_id: null,
    price,
    created_at: now(),
    updated_at: now(),
    started_at: null,
    completed_at: null,
    last_checked_at: null,
  });
}

/**
 * Free retry for a paid video that failed: a fresh generation row (new
 * idempotency key) attached to the same paid order, submitted right away.
 */
export async function retryFailedGeneration(failed: Generation): Promise<Generation> {
  const db = await getDb();
  const retry = await db.insert<Generation>("generations", {
    ...failed,
    id: undefined as unknown as string,
    provider: videoProvider().name,
    provider_request_id: null,
    provider_status_url: null,
    parts: null,
    status: "awaiting_payment",
    video_url: null,
    poster_url: null,
    error: null,
    created_at: now(),
    updated_at: now(),
    started_at: null,
    completed_at: null,
    last_checked_at: null,
  });
  if (failed.order_id) await db.update<Order>("orders", failed.order_id, { generation_id: retry.id, updated_at: now() });
  return submitGeneration(retry);
}

/**
 * Has ElevenLabs speak each clip's line (read back from the prompt, where
 * buildVideoPrompts wrote it) and uploads the audio for Seedance. Returns
 * null when the creator has no ElevenLabs voice or anything fails: the
 * video then goes out with Seedance's own voice rather than not at all.
 */
async function spokenLines(actor: Actor, prompts: string[]): Promise<string[] | null> {
  const voiceId = elevenVoiceId(actor);
  if (!voiceId) return null;
  const lines = prompts.map(lineOfPrompt);
  if (lines.some((l) => !l)) return null;
  try {
    return await Promise.all(
      lines.map(async (line, i) => {
        const { audio } = await speakLine(voiceId, line!, { previous: lines[i - 1] ?? undefined, next: lines[i + 1] ?? undefined });
        return uploadToHiggsfield(audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength) as ArrayBuffer, "audio/mpeg");
      }),
    );
  } catch (e) {
    console.error("[voice] ElevenLabs line failed, using Seedance's voice:", e instanceof Error ? e.message : e);
    return null;
  }
}

/** The spoken line of a clip prompt: `says: "…"`. */
export function lineOfPrompt(prompt: string): string | null {
  return prompt.match(/says: "([^"]+)"/)?.[1]?.trim() || null;
}

/**
 * Sends every clip to the video provider at once (one for 15 s, two for
 * 30 s), so a 30 s ad takes about as long as a 15 s one. Safe to call once
 * per generation.
 */
export async function submitGeneration(generation: Generation): Promise<Generation> {
  const db = await getDb();
  if (generation.provider_request_id) return generation;
  const actor = getActor(generation.actor_id)!;
  const provider = videoProvider();
  const actorImageUrl = actorSheetUrl(actor, appUrl());
  const voiceUrl = actorVoiceUrl(actor, appUrl());
  const webhookUrl = provider.name === "higgsfield" ? `${appUrl()}/api/webhooks/higgsfield?g=${generation.id}` : null;
  const count = clipCount(generation.duration);
  // Prompts were written at creation (with Claude's shots); rebuild only for old rows.
  const stored = generation.prompt.split(PROMPT_SEPARATOR);
  const prompts = stored.length === count ? stored : buildVideoPrompts({ ...generation, scene: "dans un décor simple et lumineux", imageUrl: generation.product_image_url }, actor);
  // Each clip's line spoken by ElevenLabs in the creator's voice; null keeps Seedance's own voice.
  const spoken = provider.name === "higgsfield" ? await spokenLines(actor, prompts.slice(0, count)) : null;
  try {
    const submitted = await Promise.all(
      prompts.slice(0, count).map((prompt, part) =>
        provider.submit({
          generation,
          part,
          parts: count,
          prompt,
          duration: Math.min(MAX_CLIP_SECONDS, generation.duration - part * MAX_CLIP_SECONDS),
          actorImageUrl,
          voiceUrl: spoken?.[part] ?? voiceUrl,
          productImageUrl: generation.product_image_url,
          webhookUrl,
        }),
      ),
    );
    const parts: GenerationPart[] = submitted.map((r) => ({ request_id: r.requestId, status_url: r.statusUrl, status: "queued", video_url: null, error: null }));
    const updated = await db.update<Generation>("generations", generation.id, {
      provider: provider.name,
      provider_request_id: parts[0].request_id,
      provider_status_url: parts[0].status_url,
      parts,
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

function partsOf(g: Generation): GenerationPart[] {
  if (g.parts?.length) return g.parts;
  // Rows created before clips existed have a single request.
  if (!g.provider_request_id) return [];
  return [{ request_id: g.provider_request_id, status_url: g.provider_status_url, status: "queued", video_url: null, error: null }];
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
  const provider = videoProvider();
  const pending = partsOf(generation).filter((p) => p.status !== "completed");
  const results = await Promise.all(
    pending.map(async (p) => {
      try {
        return { requestId: p.request_id, result: await provider.check(p, generation) };
      } catch {
        return null;
      }
    }),
  );
  let current = generation;
  for (const r of results) if (r) current = await applyResult(current, r.result, r.requestId);
  return current;
}

/**
 * Applies one clip's status (from polling or a webhook) idempotently. The
 * video completes once every clip is done; any failed clip fails it.
 */
export async function applyResult(generation: Generation, result: CheckResult, requestId?: string): Promise<Generation> {
  const db = await getDb();
  if (isTerminal(generation)) return generation;
  const target = requestId ?? generation.provider_request_id;
  const parts = partsOf(generation).map((p) =>
    p.request_id === target ? { ...p, status: result.status, video_url: result.videoUrl ?? p.video_url, error: result.error ?? null } : p,
  );

  const bad = parts.find((p) => p.status === "failed" || p.status === "nsfw");
  if (bad) {
    return (await failGeneration(generation, bad.error ?? "La génération a échoué.", bad.status === "nsfw" ? "nsfw" : "failed")) ?? generation;
  }
  if (parts.length && parts.every((p) => p.status === "completed" && p.video_url)) {
    return (await completeGeneration({ ...generation, parts }, parts.map((p) => p.video_url!))) ?? generation;
  }
  const status = parts.some((p) => p.status !== "queued") ? "in_progress" : "queued";
  return (await db.update<Generation>("generations", generation.id, { parts, status, updated_at: now() })) ?? generation;
}

async function completeGeneration(generation: Generation, clipUrls: string[]): Promise<Generation | null> {
  const db = await getDb();
  let videoUrl = clipUrls[0];
  const key = `${generation.user_id}/${generation.id}.mp4`;
  if (clipUrls.length > 1) {
    try {
      videoUrl = await putFile("outputs", key, await concatClips(clipUrls), "video/mp4");
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return failGeneration(generation, `Assemblage de la vidéo impossible : ${message}`);
    }
  } else if (generation.provider === "higgsfield") {
    // Higgsfield output URLs expire after a week: keep our own copy.
    try {
      videoUrl = await copyRemote("outputs", key, videoUrl);
    } catch {
      videoUrl = clipUrls[0];
    }
  }
  return db.update<Generation>("generations", generation.id, {
    parts: generation.parts,
    status: "completed",
    video_url: videoUrl,
    poster_url: generation.provider === "mock" ? `${appUrl()}${SAMPLE_POSTER}` : null,
    completed_at: now(),
    updated_at: now(),
  });
}

async function failGeneration(generation: Generation, error: string, status: "failed" | "nsfw" = "failed"): Promise<Generation | null> {
  const db = await getDb();
  return db.update<Generation>("generations", generation.id, { status, error, updated_at: now(), completed_at: now() });
}

export function publicGeneration(g: Generation) {
  const { prompt: _prompt, provider_status_url: _s, parts: _p, ...rest } = g;
  void _prompt;
  void _s;
  void _p;
  return rest;
}
