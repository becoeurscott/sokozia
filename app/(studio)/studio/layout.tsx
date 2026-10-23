import { StudioShell } from "@/components/studio/StudioShell";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return <StudioShell initialUser={user}>{children}</StudioShell>;
}
