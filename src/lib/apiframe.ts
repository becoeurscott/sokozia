const BASE = "https://api.apiframe.ai/v2";

function headers() {
  return { "X-API-Key": process.env.APIFRAME_API_KEY!, "Content-Type": "application/json" };
}

// Chaque modèle a son propre objet de paramètres (seedanceParams, klingParams, veoParams…) et son champ d'image de départ.
export type StyleConfig = { apiframe_model: string; params_key: string; image_key: string; apiframe_params: Record<string, unknown> | null };

export async function startVideo(style: StyleConfig, prompt: string, duration: number, imageUrl?: string | null) {
  const res = await fetch(`${BASE}/videos/generate`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model: style.apiframe_model,
      prompt,
      [style.params_key]: {
        ...(style.apiframe_params ?? {}),
        duration,
        aspect_ratio: "9:16",
        ...(imageUrl ? { [style.image_key]: imageUrl } : {}),
      },
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.jobId) throw new Error(json.message || json.error || `apiframe ${res.status}`);
  return json.jobId as string;
}

// Le format exact du résultat varie selon le modèle : on cherche la première URL vidéo.
function findUrl(v: unknown): string | null {
  if (typeof v === "string") return /^https?:\/\//.test(v) ? v : null;
  if (Array.isArray(v)) for (const x of v) { const u = findUrl(x); if (u) return u; }
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const k of ["video_url", "videoUrl", "url", "video", "output", "result"]) { const u = findUrl(o[k]); if (u) return u; }
    for (const x of Object.values(o)) { const u = findUrl(x); if (u) return u; }
  }
  return null;
}

export async function getJob(jobId: string) {
  const res = await fetch(`${BASE}/jobs/${jobId}`, { headers: headers(), cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  const job = json.job ?? json;
  const status = String(job.status ?? "").toUpperCase();
  return {
    status: status === "COMPLETED" ? "ready" : status === "FAILED" ? "failed" : "processing",
    url: status === "COMPLETED" ? findUrl(job.result ?? job) : null,
    error: job.error ?? null,
  } as const;
}
