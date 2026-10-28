import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await getCurrentUser();
  return NextResponse.json({ user });
});
