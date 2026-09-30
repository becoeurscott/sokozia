import { NextResponse } from "next/server";
import { adminClient, getSession } from "@/lib/insforge";
import { settlePayment } from "@/lib/payments";

export async function GET(req: Request) {
  const { user } = await getSession();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const { data } = await adminClient().database.from("payments").select("id").eq("id", id).eq("user_id", user.id).limit(1);
  if (!data?.length) return NextResponse.json({ status: "unknown" }, { status: 404 });
  return NextResponse.json({ status: await settlePayment(id) });
}
