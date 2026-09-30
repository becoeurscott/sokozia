import { adminClient } from "./insforge";
import { startVideo, type StyleConfig } from "./apiframe";
import { refundPass } from "./passes";

// Lance une pub pour une conversation dont le brief est prêt. passId = la pub prise dans un pass (null pour l'admin).
export async function startGeneration(o: { userId: string; conversationId: string; styleId: string; duration: number; imageUrl?: string | null; passId: string | null }) {
  const db = adminClient().database;
  const [{ data: convs }, { data: styles }] = await Promise.all([
    db.from("conversations").select("brief").eq("id", o.conversationId).eq("user_id", o.userId).limit(1),
    db.from("styles").select("id, apiframe_model, apiframe_params, params_key, image_key").eq("id", o.styleId).limit(1),
  ]);
  const brief = convs?.[0]?.brief as { video_prompt?: string } | null;
  const style = styles?.[0] as (StyleConfig & { id: string }) | undefined;
  if (!brief?.video_prompt || !style) {
    if (o.passId) await refundPass(o.passId);
    throw new Error("Brief ou style introuvable.");
  }

  const { data: created } = await db.from("videos").insert([{
    created_by: o.userId, conversation_id: o.conversationId, style_id: style.id, duration_s: o.duration,
    prompt: brief.video_prompt, image_url: o.imageUrl ?? null, pass_id: o.passId,
  }]).select("id");
  const videoId = created![0].id as string;

  try {
    const jobId = await startVideo(style, brief.video_prompt, o.duration, o.imageUrl);
    await db.from("videos").update({ apiframe_task_id: jobId, status: "processing" }).eq("id", videoId);
  } catch (e) {
    await db.from("videos").update({ status: "failed", error: String(e) }).eq("id", videoId);
    if (o.passId) await refundPass(o.passId);
    throw new Error("La génération n'a pas pu démarrer. Ta pub n'a pas été décomptée, réessaie.");
  }
  return videoId;
}
