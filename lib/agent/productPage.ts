import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Reads a product link the client pasted (shop page, Jumia, Facebook…)
 * so Awa knows what the product is: title, description and main image.
 *
 * The URL comes from the user, so the server only fetches public https
 * hosts: private, loopback and link-local addresses are refused, redirects
 * are checked one by one, and the body is capped.
 */

export interface ProductPage {
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
}

const TIMEOUT_MS = 6000;
const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 3;

export function firstLink(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<>"']+/i);
  return m ? m[0].replace(/[),.;!?]+$/, "") : null;
}

export async function readProductPage(raw: string): Promise<ProductPage | null> {
  try {
    let url = new URL(raw.startsWith("http://") ? "https://" + raw.slice(7) : raw);
    const deadline = AbortSignal.timeout(TIMEOUT_MS);
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (url.protocol !== "https:" || !(await isPublicHost(url.hostname))) return null;
      const res = await fetch(url, {
        redirect: "manual",
        signal: deadline,
        headers: { "user-agent": "Mozilla/5.0 (compatible; SokoziaBot/1.0; +https://sokozia.com)", accept: "text/html" },
      });
      if (res.status >= 300 && res.status < 400) {
        const next = res.headers.get("location");
        if (!next) return null;
        url = new URL(next, url);
        continue;
      }
      if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html")) return null;
      const html = await readCapped(res);
      return parse(url, html);
    }
  } catch {
    // Unreachable or slow page: Awa works from the text alone.
  }
  return null;
}

async function isPublicHost(host: string): Promise<boolean> {
  const h = host.replace(/^\[|\]$/g, "");
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(h)) return false;
  const addresses = isIP(h) ? [h] : (await lookup(h, { all: true })).map((a) => a.address);
  return addresses.length > 0 && addresses.every((a) => !isPrivate(a));
}

function isPrivate(ip: string): boolean {
  if (ip.includes(":")) {
    const v = ip.toLowerCase();
    if (v.startsWith("::ffff:")) return isPrivate(v.slice(7));
    return v === "::" || v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb");
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
}

async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
  }
  void reader.cancel().catch(() => {});
  return new TextDecoder().decode(Buffer.concat(chunks));
}

function parse(base: URL, html: string): ProductPage {
  const meta = (key: string) => {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`, "i");
    const tag = html.match(re)?.[0];
    return tag ? decode(tag.match(/content=["']([^"']*)["']/i)?.[1] ?? "") || null : null;
  };
  const title = meta("og:title") ?? decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "").trim() ?? null;
  const description = meta("og:description") ?? meta("description");
  const image = meta("og:image") ?? meta("twitter:image");
  let imageUrl: string | null = null;
  if (image) {
    try {
      const u = new URL(image, base);
      if (u.protocol === "https:") imageUrl = u.toString();
    } catch {
      imageUrl = null;
    }
  }
  return { url: base.toString(), title: clip(title), description: clip(description, 600), imageUrl };
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function clip(s: string | null, max = 200): string | null {
  if (!s) return null;
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
