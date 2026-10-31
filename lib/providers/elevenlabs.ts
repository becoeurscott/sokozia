import "server-only";
import voices from "../voices.json";
import type { Actor } from "../actors";

/**
 * ElevenLabs speaks each clip's line in the creator's own voice, so the
 * French is exactly what Awa wrote. Seedance then lip-syncs to that audio
 * (sent as audio_urls) and keeps it as the soundtrack.
 *
 * Voices are created once by scripts/setup-voices.mjs (Voice Design v3,
 * with the creator's intro as reference when there is one) and their ids
 * stored in lib/voices.json. Without ELEVENLABS_API_KEY or a voice id for
 * the creator, videos fall back to Seedance's own voice.
 */

const BASE = "https://api.elevenlabs.io/v1";
const MODEL_ID = process.env.ELEVENLABS_TTS_MODEL || "eleven_v3";
/** A Seedance clip is 15 s; keep a little room so the last word isn't cut. */
const MAX_LINE_SECONDS = 14.3;
/** mp3_44100_128 is constant bitrate: 128 kbit/s. */
const BYTES_PER_SECOND = 128_000 / 8;

const VOICE_IDS = voices as Record<string, string>;

export function elevenLabsConfigured(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

/** The ElevenLabs voice of a creator, when the key and the voice exist. */
export function elevenVoiceId(actor: Actor): string | null {
  if (!elevenLabsConfigured()) return null;
  return VOICE_IDS[actor.id] ?? null;
}

export interface SpokenLine {
  audio: Buffer;
  seconds: number;
}

/**
 * Speaks one line in French. If it runs longer than a clip, it is spoken
 * again a little faster (ElevenLabs speed tops out at 1.2).
 */
export async function speakLine(voiceId: string, text: string, context: { previous?: string; next?: string } = {}): Promise<SpokenLine> {
  let speed = 1;
  for (let attempt = 0; attempt < 2; attempt++) {
    const audio = await tts(voiceId, text, speed, context);
    const seconds = audio.length / BYTES_PER_SECOND;
    if (seconds <= MAX_LINE_SECONDS || speed >= 1.2) return { audio, seconds };
    speed = Math.min(1.2, Math.ceil((seconds / MAX_LINE_SECONDS) * 100) / 100 + 0.02);
  }
  const audio = await tts(voiceId, text, 1.2, context);
  return { audio, seconds: audio.length / BYTES_PER_SECOND };
}

async function tts(voiceId: string, text: string, speed: number, context: { previous?: string; next?: string }): Promise<Buffer> {
  const res = await fetch(`${BASE}/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY ?? "", "Content-Type": "application/json", Accept: "audio/mpeg" },
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      // eleven_multilingual_v2 rejects language_code; v3 and flash use it.
      ...(MODEL_ID.includes("multilingual_v2") ? {} : { language_code: "fr" }),
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true, speed },
      ...(context.previous ? { previous_text: context.previous } : {}),
      ...(context.next ? { next_text: context.next } : {}),
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}
