import { PageLoader } from "@/components/ui/PageLoader";

export default function Loading() {
  return (
    <div className="flex min-h-dvh bg-bg">
      <PageLoader label="Ton compte…" />
    </div>
  );
}
