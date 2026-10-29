import type { Style, Duration } from "./models";

export interface User {
  id: string;
  email: string;
  name?: string | null;
}

export interface Thread {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export type MessageRole = "user" | "assistant";
export type MessageKind = "text" | "brief" | "video";

export interface BriefContent {
  text: string;
  product: string;
  actorId: string;
  duration: Duration;
  style: Style;
  script: string;
  scene: string;
  /** Claude's camera direction, one per 15 s clip (English, for Seedance). */
  shots?: string[] | null;
  /** The script cut per clip by Claude, so each clip speaks a whole beat. */
  lines?: string[] | null;
  /** What Awa understood about the product (from the text, photo and link). */
  insight?: ProductInsight | null;
  /** Ad format Awa chose, e.g. "Démonstration". */
  format?: string | null;
  imageUrl?: string | null;
  /** Set once the user clicked "Créer la vidéo". */
  generationId?: string | null;
}

export interface ProductInsight {
  /** What the product is, one sentence in French. */
  what: string;
  /** Who buys it, in French. */
  audience: string;
  /** The main benefit for that buyer, in French. */
  benefit: string;
  /** Facts the client gave or that are readable on the photo or page. */
  facts: string[];
  /** How the product looks, in English, for the video model. */
  visual: string;
  /** How a person physically shows or uses it on camera, in English. */
  demo: string;
}

export interface Message {
  id: string;
  thread_id: string;
  user_id: string;
  role: MessageRole;
  kind: MessageKind;
  content: Record<string, unknown>;
  created_at: string;
}

export type GenerationStatus =
  | "awaiting_payment"
  | "queued"
  | "in_progress"
  | "completed"
  | "failed"
  | "nsfw";

/** One Seedance clip. A 30 s ad is two 15 s parts joined at the end. */
export interface GenerationPart {
  request_id: string;
  status_url: string | null;
  status: "queued" | "in_progress" | "completed" | "failed" | "nsfw";
  video_url: string | null;
  error: string | null;
}

export interface Generation {
  id: string;
  user_id: string;
  thread_id: string;
  message_id: string | null;
  style: Style;
  duration: Duration;
  actor_id: string;
  product: string;
  product_image_url: string | null;
  script: string;
  prompt: string;
  provider: "mock" | "higgsfield";
  provider_request_id: string | null;
  provider_status_url: string | null;
  /** Every clip of this video (one for 15 s, two for 30 s). */
  parts: GenerationPart[] | null;
  status: GenerationStatus;
  video_url: string | null;
  poster_url: string | null;
  error: string | null;
  order_id: string | null;
  price: number;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  last_checked_at: string | null;
}

export type OrderStatus = "pending" | "completed" | "failed" | "expired";

export interface Order {
  id: string;
  user_id: string;
  style: Style;
  duration: Duration;
  amount: number;
  currency: string;
  country: string | null;
  provider: "mock" | "pawapay" | "stripe";
  checkout_code: string | null;
  redirect_url: string | null;
  status: OrderStatus;
  generation_id: string | null;
  thread_id: string | null;
  failure: string | null;
  raw: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Upload {
  id: string;
  user_id: string;
  url: string;
  kind: "image" | "video" | "audio";
  name: string;
  created_at: string;
}

export interface WebhookEvent {
  id: string;
  provider: string;
  external_id: string;
  status: string;
  payload: Record<string, unknown>;
  received_at: string;
}
