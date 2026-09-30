import { NextResponse } from "next/server";
import { getSession } from "@/lib/insforge";
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
