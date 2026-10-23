"use client";

/** Tiny fetch wrapper: JSON in/out, French error messages. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  const res = await fetch(path, {
    ...rest,
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(rest.headers ?? {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new ApiError(res.status, data?.error ?? "Une erreur est survenue.");
  return data;
}

export async function uploadFile(file: File): Promise<{ id: string; url: string; kind: string; name: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const { upload } = await api<{ upload: { id: string; url: string; kind: string; name: string } }>("/api/uploads", { method: "POST", body: fd });
  return upload;
}
