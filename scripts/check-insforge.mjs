// Smoke test for the InsForge backend: writes, reads, updates and deletes one
// row in each sz_ table chain, and uploads/removes one file in sz-outputs.
// Leaves nothing behind. Run: node --env-file=.env scripts/check-insforge.mjs
import { createAdminClient } from "@insforge/sdk";

const admin = createAdminClient({ baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL, apiKey: process.env.INSFORGE_API_KEY });
const db = admin.database;
const userId = crypto.randomUUID();
const ok = (label, error) => {
  if (error) throw new Error(`${label}: ${error.message ?? JSON.stringify(error)}`);
  console.log("✓", label);
};

const { data: thread, error: e1 } = await db.from("sz_threads").insert({ user_id: userId, title: "check" }).select().single();
ok("insert sz_threads", e1);
const { error: e2 } = await db.from("sz_messages").insert({ thread_id: thread.id, user_id: userId, role: "user", kind: "text", content: { text: "hi" } });
ok("insert sz_messages", e2);
const parts = [{ request_id: "r0", status_url: null, status: "queued", video_url: null, error: null }];
const { data: gen, error: e3 } = await db
  .from("sz_generations")
  .insert({ user_id: userId, thread_id: thread.id, duration: 30, actor_id: "aicha", product: "x", script: "x", prompt: "x", price: 5080, status: "queued", parts })
  .select()
  .single();
ok("insert sz_generations (jsonb parts)", e3);
const { data: upd, error: e4 } = await db.from("sz_generations").update({ status: "completed" }).eq("id", gen.id).select().maybeSingle();
ok(`update sz_generations → ${upd?.status}`, e4);
const { error: e5 } = await db.from("sz_webhook_events").insert({ provider: "check", external_id: gen.id, status: "x" });
ok("insert sz_webhook_events", e5);
const { error: dup } = await db.from("sz_webhook_events").insert({ provider: "check", external_id: gen.id, status: "x" });
console.log(dup ? "✓ duplicate webhook rejected" : "✗ duplicate webhook accepted");
const { error: badDur } = await db.from("sz_generations").insert({ user_id: userId, thread_id: thread.id, duration: 20, actor_id: "a", product: "x", script: "x", prompt: "x", price: 1 });
console.log(badDur ? "✓ 20 s duration rejected" : "✗ 20 s duration accepted");

const bucket = admin.storage.from("sz-outputs");
const key = `check/${userId}.txt`;
const { data: up, error: e6 } = await bucket.upload(key, new Blob(["ok"], { type: "text/plain" }));
ok(`upload sz-outputs (${up?.url ? "public url" : "no url"})`, e6);
if (up?.url) console.log(`  fetch public url → ${(await fetch(up.url)).status}`);
const { error: e7 } = await bucket.remove(key);
ok("remove upload", e7);

await db.from("sz_webhook_events").delete().eq("provider", "check");
const { error: e8 } = await db.from("sz_threads").delete().eq("id", thread.id);
ok("delete thread (cascades messages + generation)", e8);
const { data: left } = await db.from("sz_generations").select("id").eq("user_id", userId);
console.log(left?.length ? `✗ ${left.length} rows left` : "✓ nothing left behind");
