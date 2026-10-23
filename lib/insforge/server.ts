import "server-only";
import { createAdminClient, type InsForgeClient } from "@insforge/sdk";

let admin: InsForgeClient | null = null;

/** Project-admin client. Only ever used inside API routes / server code. */
export function getAdminClient(): InsForgeClient {
  if (admin) return admin;
  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
  const apiKey = process.env.INSFORGE_API_KEY;
  if (!baseUrl || !apiKey) throw new Error("InsForge is not configured (NEXT_PUBLIC_INSFORGE_URL / INSFORGE_API_KEY).");
  admin = createAdminClient({ baseUrl, apiKey });
  return admin;
}
