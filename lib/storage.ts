import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { isInsForgeConfigured, newId } from "./db";
import { appUrl } from "./auth";

/**
 * File storage with a public URL.
 *  - InsForge: public bucket (`uploads` / `outputs`), URL from the SDK.
 *  - Local: .data/files/<bucket>/<key>, served by /api/files/[...path].
 */
export type Bucket = "uploads" | "outputs";

const LOCAL_ROOT = path.join(process.cwd(), ".data", "files");

export async function putFile(bucket: Bucket, key: string, bytes: ArrayBuffer | Buffer, contentType: string): Promise<string> {
  if (isInsForgeConfigured()) {
    const { getAdminClient } = await import("./insforge/server");
    const b = getAdminClient().storage.from(bucket);
    const blob = new Blob([bytes as BlobPart], { type: contentType });
    const { data, error } = await b.upload(key, blob as unknown as File);
    if (error || !data) throw new Error(`Upload échoué: ${error?.message ?? "inconnu"}`);
    return data.url || (b.getPublicUrl(key) as unknown as { data?: { publicUrl?: string } }).data?.publicUrl || "";
  }
  const file = path.join(LOCAL_ROOT, bucket, key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, Buffer.from(bytes as ArrayBuffer));
  return `${appUrl()}/api/files/${bucket}/${key}`;
}

export async function readLocalFile(bucket: string, key: string): Promise<Buffer | null> {
  const file = path.join(LOCAL_ROOT, bucket, key);
  if (!file.startsWith(LOCAL_ROOT)) return null;
  try {
    return await fs.readFile(file);
  } catch {
    return null;
  }
}

export function extensionFor(contentType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/x-m4a": "m4a",
    "audio/aac": "aac",
  };
  return map[contentType] ?? "bin";
}

export function newKey(userId: string, contentType: string): string {
  return `${userId}/${newId()}.${extensionFor(contentType)}`;
}

/** Copy a remote file (e.g. a Higgsfield output that expires) into our storage. */
export async function copyRemote(bucket: Bucket, key: string, url: string): Promise<string> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Téléchargement impossible (${res.status})`);
  const type = res.headers.get("content-type") ?? "video/mp4";
  return putFile(bucket, key, await res.arrayBuffer(), type);
}
