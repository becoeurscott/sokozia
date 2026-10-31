import "server-only";
import type { CheckResult, SubmitInput, SubmitResult, VideoProvider } from "./types";
import { MAX_CLIP_SECONDS, MODEL } from "../models";

const BASE = "https://api.higgsfield.ai";

/** "id:secret", from HF_CREDENTIALS (as the earlier app stored it) or the two separate keys. */
export function hfCredentials(): string | null {
  const joined = process.env.HF_CREDENTIALS;
  if (joined && joined.includes(":")) return joined;
  const id = process.env.HF_API_KEY_ID;
  const secret = process.env.HF_API_KEY_SECRET;
  return id && secret ? `${id}:${secret}` : null;
}

function authHeader(): string {
  const c = hfCredentials();
  if (!c) throw new Error("Higgsfield n'est pas configuré (HF_CREDENTIALS, ou HF_API_KEY_ID + HF_API_KEY_SECRET).");
  return `Key ${c}`;
}

async function hf<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON error body */
  }
  if (!res.ok) {
    const msg = (json as { detail?: string; message?: string; error?: string } | null)?.detail
      ?? (json as { message?: string } | null)?.message
      ?? (json as { error?: string } | null)?.error
      ?? text.slice(0, 200);
    throw new Error(`Higgsfield ${res.status}: ${msg}`);
  }
  return json as T;
}

/** Seedance 2.0 reference-to-video body for one clip (max 15 s). */
export function buildBody(input: SubmitInput): { path: string; body: Record<string, unknown> } {
  const { actorImageUrl, productImageUrl } = input;
  const images = [actorImageUrl, productImageUrl].filter(Boolean) as string[];
  return {
    path: MODEL.higgsfield.path,
    body: {
      prompt: input.prompt,
      image_urls: images,
      // The creator's recorded voice: Seedance speaks the script with it (tested 2026-10-31).
      ...(input.voiceUrl ? { audio_urls: [input.voiceUrl] } : {}),
      duration: Math.min(MAX_CLIP_SECONDS, input.duration),
      aspect_ratio: "9:16",
      resolution: MODEL.higgsfield.resolution,
      generate_audio: true,
    },
  };
}

interface SubmitResponse {
  status: string;
  request_id: string;
  status_url: string;
  cancel_url: string;
}

interface StatusResponse {
  status: "queued" | "in_progress" | "completed" | "failed" | "nsfw" | "canceled";
  request_id: string;
  video?: { url: string } | null;
  error?: string | { message?: string } | null;
}

export const higgsfieldVideo: VideoProvider = {
  name: "higgsfield",
  async submit(input): Promise<SubmitResult> {
    const { path, body } = buildBody(input);
    const url = new URL(`${BASE}/${path}`);
    if (input.webhookUrl) url.searchParams.set("hf_webhook", input.webhookUrl);
    const res = await hf<SubmitResponse>(url.toString(), {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Idempotency-Key": `${input.generation.id}:${input.part}` },
    });
    return { requestId: res.request_id, statusUrl: res.status_url };
  },
  async check(part): Promise<CheckResult> {
    const url = part.status_url ?? `${BASE}/requests/${part.request_id}/status`;
    const res = await hf<StatusResponse>(url);
    return mapStatus(res.status, res.video?.url ?? null, res.error);
  },
};

export function mapStatus(status: string, videoUrl: string | null, error: unknown): CheckResult {
  const err = typeof error === "string" ? error : (error as { message?: string } | null)?.message ?? null;
  switch (status) {
    case "queued":
      return { status: "queued" };
    case "in_progress":
      return { status: "in_progress" };
    case "completed":
      return { status: "completed", videoUrl };
    case "nsfw":
      return { status: "nsfw", error: err ?? "Contenu refusé par la modération." };
    case "canceled":
    case "failed":
    default:
      return { status: "failed", error: err ?? "La génération a échoué." };
  }
}

/** Upload a file so it has a public URL Higgsfield can read. */
export async function uploadToHiggsfield(bytes: ArrayBuffer, contentType: string): Promise<string> {
  const ticket = await hf<{ public_url: string; upload_url: string; content_type: string; upload_headers: Record<string, string> }>(
    `${BASE}/files/generate-upload-url`,
    { method: "POST", body: JSON.stringify({ content_type: contentType }) },
  );
  const put = await fetch(ticket.upload_url, {
    method: "PUT",
    headers: { ...ticket.upload_headers, "Content-Type": ticket.content_type || contentType },
    body: bytes,
  });
  if (!put.ok) throw new Error(`Upload Higgsfield échoué (${put.status}).`);
  return ticket.public_url;
}
