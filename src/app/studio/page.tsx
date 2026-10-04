import { redirect } from "next/navigation";
import { adminClient, getSession } from "@/lib/insforge";
import { currencyOf, fmt, loadPricing, planPrice } from "@/lib/pricing";
import { activePasses } from "@/lib/passes";
import Studio from "@/components/Studio";

export default async function Page({ searchParams }: { searchParams: Promise<{ projet?: string }> }) {
  const { projet } = await searchParams;
  const { profile } = await getSession();
  if (!profile) redirect("/connexion?next=/studio");
  const [pricing, passes, { data: convs }] = await Promise.all([
    loadPricing(),
    activePasses(profile.id),
    adminClient().database.from("conversations").select("id, title, created_at")
      .eq("user_id", profile.id).order("created_at", { ascending: false }).limit(40),
  ]);
  const currency = currencyOf(profile.country);
  const left = (styleId: string, d: number) =>
    passes.filter((p) => p.style_id === styleId && p.duration_s === d).reduce((n, p) => n + p.remaining, 0);
  const styles = pricing.styles.map((s) => ({
    id: s.id, name: s.name_fr, description: s.description_fr,
    options: Object.fromEntries(s.durations.map((d) => [d, {
      price: fmt(planPrice(pricing, "single", s, d, currency), currency),
      remaining: left(s.id, d),
    }])),
  }));
  const packs = pricing.styles.flatMap((s) => s.durations.map((d) => ({ label: `${s.name_fr} · ${d} s`, remaining: left(s.id, d) })))
    .filter((p) => p.remaining > 0);
  return (
    <Studio
      conversations={(convs ?? []) as { id: string; title: string; created_at: string }[]}
      styles={styles} durations={pricing.durations} packs={packs} isAdmin={profile.is_admin}
      firstName={profile.full_name.split(" ")[0]}
      initialProjectId={projet}
    />
  );
}
