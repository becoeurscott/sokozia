// Higgsfield (api.higgsfield.ai) : on soumet un travail, puis on suit son statut.
// Clé HF_CREDENTIALS = "id:secret", serveur uniquement.
const API = "https://api.higgsfield.ai";

function auth() {
  const c = process.env.HF_CREDENTIALS;
  if (!c || !c.includes(":")) throw new Error("Higgsfield non configuré (HF_CREDENTIALS manquant).");
  return { Authorization: `Key ${c}`, "Content-Type": "application/json" };
}

type Raw = { status?: string; request_id?: string; images?: { url: string }[]; video?: { url: string }; detail?: unknown; message?: string };

export async function hfSubmit(endpoint: string, input: Record<string, unknown>) {
  const res = await fetch(`${API}/${endpoint.replace(/^\//, "")}`, { method: "POST", headers: auth(), body: JSON.stringify(input) });
  const json = (await res.json().catch(() => ({}))) as Raw;
  if (!res.ok || !json.request_id) {
    if (res.status === 402) throw new Error("Higgsfield : crédits insuffisants.");
    throw new Error(`higgsfield ${res.status} ${JSON.stringify(json.detail ?? json.message ?? "").slice(0, 200)}`);
  }
  return json.request_id;
}

export async function hfStatus(requestId: string) {
  const res = await fetch(`${API}/requests/${encodeURIComponent(requestId)}/status`, { headers: auth(), cache: "no-store" });
  const json = (await res.json().catch(() => ({}))) as Raw;
  const s = String(json.status ?? "");
  const url = json.video?.url ?? json.images?.[0]?.url ?? null;
  return {
    status: s === "completed" ? (url ? "ready" : "failed") : ["failed", "nsfw", "canceled"].includes(s) ? "failed" : "processing",
    url: s === "completed" ? url : null,
    error: s === "nsfw" ? "Contenu refusé par la modération." : s === "failed" ? "Génération échouée." : null,
  } as const;
}

// Prix réel d'une requête, sans rien générer (gratuit).
export async function hfEstimate(endpoint: string, input: Record<string, unknown>) {
  const res = await fetch(`${API}/estimate/${endpoint.replace(/^\//, "")}`, { method: "POST", headers: auth(), body: JSON.stringify(input) });
  const text = await res.text();
  if (!res.ok) return { ok: false as const, status: res.status, error: text.slice(0, 300) };
  const j = JSON.parse(text) as { credits?: number | string; usd?: number | string };
  return { ok: true as const, credits: Number(j.credits), usd: Number(j.usd) };
}
