import "server-only";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Joins Seedance clips into one mp4 (30 s ads are two 15 s clips).
 * Clips come from the same model with the same settings, so a stream copy
 * works and takes well under a second; re-encode only if it fails.
 */
export async function concatClips(urls: string[]): Promise<Buffer> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "sokozia-"));
  try {
    const files: string[] = [];
    await Promise.all(
      urls.map(async (url, i) => {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`Téléchargement du clip ${i + 1} impossible (${res.status})`);
        const file = path.join(dir, `clip${i}.mp4`);
        await fs.writeFile(file, Buffer.from(await res.arrayBuffer()));
        files[i] = file;
      }),
    );
    const list = path.join(dir, "list.txt");
    await fs.writeFile(list, files.map((f) => `file '${f.replace(/\\/g, "/")}'`).join("\n"));
    const out = path.join(dir, "out.mp4");
    const base = ["-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list];
    try {
      await ffmpeg([...base, "-c", "copy", "-movflags", "+faststart", out]);
    } catch {
      await ffmpeg([...base, "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "aac", "-movflags", "+faststart", out]);
    }
    return await fs.readFile(out);
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/** First line of `ffmpeg -version`, for the /api/health check. */
export async function ffmpegVersion(): Promise<string> {
  const bin = await ffmpegPath();
  return new Promise((resolve, reject) => {
    const p = spawn(bin, ["-version"], { stdio: ["ignore", "pipe", "ignore"] });
    let out = "";
    p.stdout.on("data", (d) => (out += String(d)));
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve(out.split("\n")[0].trim()) : reject(new Error(`exit ${code}`))));
  });
}

async function ffmpegPath(): Promise<string> {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  const mod = (await import("ffmpeg-static")) as unknown as { default?: string | null };
  const bin = mod.default ?? (mod as unknown as string | null);
  if (!bin) throw new Error("ffmpeg introuvable : installe ffmpeg-static ou définis FFMPEG_PATH.");
  return bin;
}

async function ffmpeg(args: string[]): Promise<void> {
  const bin = await ffmpegPath();
  await new Promise<void>((resolve, reject) => {
    const p = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => (err += String(d)));
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}: ${err.slice(0, 300)}`))));
  });
}
