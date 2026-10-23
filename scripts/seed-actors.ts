/**
 * Generates one portrait per creator with Higgsfield SOUL and saves it to
 * public/actors/<id>.jpg. Run once, with real keys:
 *
 *   npx tsx scripts/seed-actors.ts            # all missing portraits
 *   npx tsx scripts/seed-actors.ts aicha kofi # only these
 *
 * Portraits are the identity reference sent with every video request, so
 * keep them: regenerating one changes that creator's face.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { ACTORS } from "../lib/actors";

const BASE = "https://api.higgsfield.ai";
const OUT = path.join(process.cwd(), "public", "actors");

function auth(): string {
  const id = process.env.HF_API_KEY_ID;
  const secret = process.env.HF_API_KEY_SECRET;
  if (!id || !secret) throw new Error("Set HF_API_KEY_ID and HF_API_KEY_SECRET (see .env).");
  return `Key ${id}:${secret}`;
}

async function call<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { ...init, headers: { Authorization: auth(), "Content-Type": "application/json", ...(init.headers ?? {}) } });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

async function generate(prompt: string): Promise<string> {
  const submit = await call<{ request_id: string; status_url: string }>(`${BASE}/higgsfield-ai/soul/v2/standard`, {
    method: "POST",
    body: JSON.stringify({ prompt, aspect_ratio: "3:4" }),
  });
  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const s = await call<{ status: string; images?: Array<{ url: string }>; error?: string }>(submit.status_url);
    if (s.status === "completed" && s.images?.[0]?.url) return s.images[0].url;
    if (s.status === "failed" || s.status === "nsfw") throw new Error(s.error ?? s.status);
  }
  throw new Error("timeout");
}

async function main() {
  const only = process.argv.slice(2);
  await fs.mkdir(OUT, { recursive: true });
  for (const a of ACTORS) {
    if (only.length && !only.includes(a.id)) continue;
    const file = path.join(OUT, `${a.id}.jpg`);
    try {
      await fs.access(file);
      console.log(`skip ${a.id} (exists)`);
      continue;
    } catch {
      /* missing */
    }
    const prompt = `Portrait photo of ${a.look}, ${a.age} years old, from ${a.country}, looking at the camera with a warm natural smile, soft daylight, shallow depth of field, phone camera realism, UGC creator headshot, plain warm background, no text.`;
    console.log(`generating ${a.id}…`);
    const url = await generate(prompt);
    const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
    await fs.writeFile(file, bytes);
    console.log(`saved ${file} (${Math.round(bytes.length / 1024)} KB)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
