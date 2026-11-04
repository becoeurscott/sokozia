import { NextResponse } from "next/server";

// Ancien studio en conversation (fermé) : ces routes lançaient des générations Claude/Higgsfield
// sans paiement. Le studio actuel passe uniquement par /api/render (débit du portefeuille).
const gone = () => NextResponse.json({ error: "Cette fonction n'existe plus. Utilise le studio." }, { status: 410 });
export const GET = gone;
export const POST = gone;
export const PATCH = gone;
export const DELETE = gone;
