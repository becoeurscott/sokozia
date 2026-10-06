import { adminClient } from "./insforge";
import { getJobStatus, STYLE_COLS, startVideoJob, type StyleRow } from "./providers";
import { refundPass } from "./passes";
import { syncImages } from "./project";

type Row = { id: string; created_by: string; status: string; apiframe_task_id: string | null; pass_id: string | null; video_url: string | null; image_url?: string | null; conversation_id?: string | null; style_id?: string; duration_s?: number; prompt?: string };

async function failVideo(v: Row, error: string) {
  const { data: claimed } = await adminClient().database.from("videos")
    .update({ status: "failed", error, updated_at: new Date().toISOString() })
    .eq("id", v.id).in("status", ["pending", "processing"]).select("id");
  if (claimed?.length && v.pass_id) await refundPass(v.pass_id);
  // Le projet revient à l'étape vidéo pour pouvoir relancer (la pub n'a pas été décomptée).
  if (claimed?.length && v.conversation_id) await adminClient().database.from("conversations").update({ step: "video" }).eq("id", v.conversation_id);
  return { ...v, status: "failed" };
}

// Fait avancer une pub : image d'ouverture -> vidéo -> copie dans NOTRE stockage (propriété Sokozia).
// En cas d'échec, la pub est rendue au pass.
export async function syncVideo(v: Row): Promise<Row> {
  const db = adminClient().database;

  if (v.status === "pending" && v.image_url?.startsWith("frame:") && v.conversation_id) {
    await syncImages(v.conversation_id);
    const { data } = await db.from("project_images").select("status, url").eq("id", v.image_url.slice(6)).limit(1);
    const frame = data?.[0];
    if (frame?.status === "failed") return failVideo(v, "frame failed");
    if (frame?.status !== "ready" || !frame.url) return v;
    const { data: st } = await db.from("styles").select(STYLE_COLS).eq("id", v.style_id!).limit(1);
    try {
      const jobId = await startVideoJob(st![0] as StyleRow, v.prompt!, v.duration_s!, { startImage: frame.url });
      await db.from("videos").update({ apiframe_task_id: jobId, status: "processing", image_url: frame.url }).eq("id", v.id).eq("status", "pending");
      return { ...v, status: "processing", apiframe_task_id: jobId };
    } catch (e) {
      return failVideo(v, String(e));
    }
  }

  if (v.status !== "processing" || !v.apiframe_task_id) return v;
  const job = await getJobStatus(v.apiframe_task_id);
  if (job.status === "failed") return failVideo(v, String(job.error ?? "failed"));
  if (job.status !== "ready" || !job.url) return v;

  const file = await fetch(job.url);
  if (!file.ok) return v;
  const { data: up, error } = await adminClient().storage.from("videos").upload(`${v.id}.mp4`, await file.blob());
  if (error || !up) return v;
  await db.from("videos").update({
    status: "ready", storage_key: up.key, video_url: up.url, updated_at: new Date().toISOString(),
  }).eq("id", v.id);
  return { ...v, status: "ready", video_url: up.url };
}

export const VIDEO_COLS = "id, created_by, status, apiframe_task_id, pass_id, video_url, image_url, conversation_id, style_id, duration_s, prompt";
