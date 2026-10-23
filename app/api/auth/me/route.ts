import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { activeCredits } from "@/lib/services/credits";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null, credits: [] });
  const credits = await activeCredits(user.id);
  return NextResponse.json({ user, credits });
});
