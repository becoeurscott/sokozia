import { NextResponse } from "next/server";
import { ffmpegVersion } from "@/lib/video/concat";
import { isMock } from "@/lib/providers";
import { hfCredentials } from "@/lib/providers/higgsfield";
import { isInsForgeConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Readiness check after a deploy. Reports what is wired, never key values. */
export async function GET() {
  let ffmpeg: string | null = null;
  try {
    ffmpeg = await ffmpegVersion();
  } catch (e) {
    ffmpeg = `error: ${e instanceof Error ? e.message.slice(0, 120) : "unknown"}`;
  }
  return NextResponse.json({
    mode: isMock() ? "test" : "live",
    insforge: isInsForgeConfigured(),
    higgsfield: Boolean(hfCredentials()),
    pawapay: Boolean(process.env.PAWAPAY_API_TOKEN),
    pawapaySandbox: (process.env.PAWAPAY_BASE_URL ?? "").includes("sandbox"),
    ffmpeg,
  });
}
