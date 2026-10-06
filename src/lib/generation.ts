import { adminClient } from "./insforge";
import { STYLE_COLS, startVideoJob, type StyleRow } from "./providers";
import { refundPass } from "./passes";
import { videoPrompt, framePrompt, modelGuide } from "./director";
import { findFormat } from "@/content/formats";
import { approvedRefs, genImage, loadProject } from "./project";

type FullStyle = StyleRow & { id: string };

// Lance la pub d'un projet arrivé à l'étape vidéo. passId = la pub prise dans un pass (null pour l'admin).
export async function startGeneration(o: { userId: string; conversationId: string; styleId: string; passId: string | null }) {
  const db = adminClient().database;
  const fail = async (msg: string) => { if (o.passId) await refundPass(o.passId); throw new Error(msg); };

  const p = await loadProject(o.userId, o.conversationId);
  if (!p || p.step !== "video" || !p.script || !p.duration_s || !p.product) return fail("Termine d'abord les étapes du projet.");
  const { data: styles } = await db.from("styles").select(STYLE_COLS).eq("id", o.styleId).limit(1);
  const style = styles?.[0] as FullStyle | undefined;
  if (!style) return fail("Style introuvable.");
  const refs = await approvedRefs(p.id);
  if (refs.length < 3) return fail("Il manque une image validée (produit, créateur ou lieu).");

  const withRefs = style.provider === "higgsfield" ? style.hf_endpoint?.includes("reference") ?? false : Boolean(style.refs_key);
  const { prompt } = await videoPrompt(p.product, p.script, p.duration_s, withRefs, p.creator_desc ?? "", {
    guide: modelGuide(style.provider === "higgsfield" ? style.hf_endpoint : style.apiframe_model),
    format: findFormat(p.format_id)?.direction,
  });
  const { data: created } = await db.from("videos").insert([{
    created_by: o.userId, conversation_id: p.id, style_id: style.id, duration_s: p.duration_s, prompt, pass_id: o.passId,
  }]).select("id");
  const videoId = created![0].id as string;

  try {
    if (withRefs) {
      const jobId = await startVideoJob(style, prompt, p.duration_s, { refs });
      await db.from("videos").update({ apiframe_task_id: jobId, status: "processing" }).eq("id", videoId);
    } else {
      // Pas de références pour ce modèle : on crée d'abord l'image d'ouverture (créateur + lieu + produit),
      // la vidéo démarre dans syncVideo dès qu'elle est prête.
      const [creator, product, location] = refs;
      const f = await framePrompt(p.product, p.script, p.creator_desc ?? "");
      const frameId = await genImage(p.id, "frame", f.prompt, "9:16", [creator, location, product]);
      await db.from("videos").update({ image_url: `frame:${frameId}` }).eq("id", videoId);
    }
    await db.from("conversations").update({ step: "done" }).eq("id", p.id);
  } catch (e) {
    await db.from("videos").update({ status: "failed", error: String(e) }).eq("id", videoId);
    return fail("La génération n'a pas pu démarrer. Ta pub n'a pas été décomptée, réessaie.");
  }
  return videoId;
}
