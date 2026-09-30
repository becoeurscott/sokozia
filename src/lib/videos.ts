import { adminClient } from "./insforge";
import { getJob } from "./apiframe";
import { refundPass } from "./passes";

type Row = { id: string; created_by: string; status: string; apiframe_task_id: string | null; pass_id: string | null; video_url: string | null };

// Interroge APIFrame, copie la vidéo dans NOTRE stockage (propriété Sokozia), rend la pub au pass si échec.
export async function syncVideo(v: Row): Promise<Row> {
  if (v.status !== "processing" || !v.apiframe_task_id) return v;
  const job = await getJob(v.apiframe_task_id);
  const admin = adminClient();
  if (job.status === "failed") {
    const { data: claimed } = await admin.database.from("videos")
      .update({ status: "failed", error: String(job.error ?? "failed"), updated_at: new Date().toISOString() })
      .eq("id", v.id).eq("status", "processing").select("id");
    if (claimed?.length && v.pass_id) await refundPass(v.pass_id);
    return { ...v, status: "failed" };
  }
  if (job.status !== "ready" || !job.url) return v;

  const file = await fetch(job.url);
  if (!file.ok) return v;
  const blob = await file.blob();
  const key = `${v.id}.mp4`;
  const { data: up, error } = await admin.storage.from("videos").upload(key, blob);
  if (error || !up) return v;
  await admin.database.from("videos").update({
    status: "ready", storage_key: up.key, video_url: up.url, updated_at: new Date().toISOString(),
  }).eq("id", v.id);
  return { ...v, status: "ready", video_url: up.url };
}
