import { NextResponse, type NextRequest } from "next/server";
import { readLocalFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mp3: "audio/mpeg",
  wav: "audio/wav",
};

/** Serves files from the local store (development without InsForge). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const [bucket, ...rest] = path;
  if (!bucket || rest.length === 0 || rest.some((p) => p.includes(".."))) return new NextResponse("Not found", { status: 404 });
  const bytes = await readLocalFile(bucket, rest.join("/"));
  if (!bytes) return new NextResponse("Not found", { status: 404 });
  const ext = rest[rest.length - 1].split(".").pop() ?? "";
  return new NextResponse(new Uint8Array(bytes), {
    headers: { "Content-Type": TYPES[ext] ?? "application/octet-stream", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
