import { NextResponse } from "next/server";
import { adminClient, getSession } from "@/lib/insforge";
import { act, loadProject, projectState } from "@/lib/project";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Ctx) {
  const { user } = await getSession();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const p = await loadProject(user.id, (await params).id);
  if (!p) return NextResponse.json({ error: "introuvable" }, { status: 404 });
  return NextResponse.json(await projectState(p));
}

// Actions : approve | revise | regenerate | pick | duration
export async function POST(req: Request, { params }: Ctx) {
  const { user } = await getSession();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = (await params).id;
  const p = await loadProject(user.id, id);
  if (!p) return NextResponse.json({ error: "introuvable" }, { status: 404 });
  let error: string | undefined;
  try {
    await act(p, await req.json());
  } catch (e) {
    error = (e as Error).message.startsWith("director") ? "Awa est occupée, réessaie dans un instant." : (e as Error).message;
  }
  return NextResponse.json({ ...(await projectState((await loadProject(user.id, id))!)), error });
}

// Renommer un projet (chat).
export async function PATCH(req: Request, { params }: Ctx) {
  const { user } = await getSession();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const title = String((await req.json()).title ?? "").trim().slice(0, 60);
  if (!title) return NextResponse.json({ error: "Le nom ne peut pas être vide." }, { status: 400 });
  const { data } = await adminClient().database.from("conversations").update({ title })
    .eq("id", (await params).id).eq("user_id", user.id).select("id, title");
  if (!data?.length) return NextResponse.json({ error: "introuvable" }, { status: 404 });
  return NextResponse.json(data[0]);
}

// Supprimer un projet (chat) : messages et images de travail sont supprimés.
// Les vidéos déjà créées restent dans « Mes vidéos » (et restent propriété de Sokozia).
export async function DELETE(_: Request, { params }: Ctx) {
  const { user } = await getSession();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = (await params).id;
  const db = adminClient().database;
  const { data: busy } = await db.from("videos").select("id").eq("conversation_id", id).in("status", ["pending", "processing"]).limit(1);
  if (busy?.length) return NextResponse.json({ error: "Une pub de ce projet est en cours de création. Attends la fin avant de le supprimer." }, { status: 409 });
  const { data } = await db.from("conversations").delete().eq("id", id).eq("user_id", user.id).select("id");
  if (!data?.length) return NextResponse.json({ error: "introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
