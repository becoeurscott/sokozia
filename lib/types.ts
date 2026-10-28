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
  imageUrl?: string | null;
  /** Set once the user clicked "Créer la vidéo". */
  generationId?: string | null;
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
  provider: "mock" | "pawapay";
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
