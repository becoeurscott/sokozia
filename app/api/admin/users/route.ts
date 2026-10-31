import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { requireAdmin, searchUsers } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** Admin: customers matching ?q= (email or name), with their balance. */
export const GET = route(async (req) => {
  await requireAdmin();
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
  return NextResponse.json({ users: await searchUsers(q) });
});
