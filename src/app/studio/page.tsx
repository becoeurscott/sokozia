import { redirect } from "next/navigation";
import { adminClient, getSession } from "@/lib/insforge";
import { currencyOf, loadPricing } from "@/lib/pricing";
import { getWallet } from "@/lib/wallet";
import RenderStudio, { type ModelCard, type Recent } from "@/components/render/RenderStudio";
import { DIRECTORS } from "@/lib/director";

export const metadata = { title: "Studio — Sokozia" };
const ETA: Record<string, number> = { eclair: 100, naturel: 160, studio: 200, signature: 260 };

export default async function Page() {
  const { profile } = await getSession();
  if (!profile) redirect("/connexion?next=/studio");
  const [pricing, wallet, { data: vids }] = await Promise.all([
    loadPricing(),
    getWallet(profile.id),
    adminClient().database.from("videos").select("id, status, video_url, image_url, aspect_ratio, prompt, created_at")
      .eq("created_by", profile.id).order("created_at", { ascending: false }).limit(12),
  ]);
  const currency = currencyOf(profile.country);
  const models: ModelCard[] = pricing.styles.map((s) => ({
    id: s.id, name: s.name_fr, quality: s.quality_fr, description: s.description_fr, durations: s.durations,
    aspects: s.aspect_ratios, eta: ETA[s.id] ?? 180, sample: s.sample_clip,
  }));
  const recent: Recent[] = ((vids ?? []) as { id: string; status: string; video_url: string | null; image_url: string | null; aspect_ratio: string | null; prompt: string | null; created_at: string }[])
    .map((v) => ({ id: v.id, status: v.status, url: v.video_url, image: v.image_url?.startsWith("http") ? v.image_url : null, aspect: v.aspect_ratio ?? "9:16", prompt: v.prompt ?? "", created_at: v.created_at }));
  return (
    <RenderStudio models={models} directors={Object.entries(DIRECTORS).map(([id, d]) => ({ id, name: d.name, hint: d.hint }))} balance={wallet.balance} currency={currency === "XOF" || currency === "XAF" ? "FCFA" : currency}
      isAdmin={profile.is_admin} name={profile.full_name} recent={recent} />
  );
}
