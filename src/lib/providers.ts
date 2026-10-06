import { adminClient } from "./insforge";
import * as af from "./apiframe";
import { hfStatus, hfSubmit } from "./higgsfield";

// Aiguillage APIFrame / Higgsfield. Les identifiants de travaux Higgsfield sont préfixés « hf: ».

export type StyleRow = af.StyleConfig & { provider?: string | null; hf_endpoint?: string | null; hf_params?: Record<string, unknown> | null };
export const STYLE_COLS = "id, provider, hf_endpoint, hf_params, apiframe_model, apiframe_params, params_key, image_key, refs_key";

export async function startVideoJob(style: StyleRow, prompt: string, duration: number, o: { startImage?: string | null; refs?: string[] } = {}) {
  if (style.provider === "higgsfield" && style.hf_endpoint) {
    const input: Record<string, unknown> = { prompt, duration, aspect_ratio: "9:16", ...(style.hf_params ?? {}) };
    if (o.refs?.length) input.image_urls = o.refs.slice(0, 4);
    else if (o.startImage) input.image_url = o.startImage;
    return `hf:${await hfSubmit(style.hf_endpoint, input)}`;
  }
  return af.startVideo(style, prompt, duration, o);
}

type ImageProvider = { provider: string; hf_endpoint: string; hf_params: Record<string, unknown> };

export async function startImageJob(prompt: string, aspect: "16:9" | "9:16", refs: string[]) {
  const db = adminClient().database;
  const { data } = await db.from("settings").select("key, value").in("key", ["image_provider", "image_model"]);
  const s = Object.fromEntries((data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]));
  const ip = s.image_provider as ImageProvider | undefined;
  if (ip?.provider === "higgsfield") {
    return `hf:${await hfSubmit(ip.hf_endpoint, { prompt, aspect_ratio: aspect, ...ip.hf_params, ...(refs.length ? { image_urls: refs.slice(0, 4) } : {}) })}`;
  }
  return af.startImage(s.image_model as af.ImageModel, prompt, aspect, refs);
}

export async function getJobStatus(taskId: string) {
  return taskId.startsWith("hf:") ? hfStatus(taskId.slice(3)) : af.getJob(taskId);
}
