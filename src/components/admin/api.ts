"use client";

export type ApiResult<T = unknown> = { ok: true; data: T } | { ok: false; status: number; errors: string[] };

/** Same-origin admin API call. The custom header is the CSRF defence the server requires on every state-changing request. */
export async function api<T = unknown>(method: "GET" | "POST" | "PUT" | "DELETE", url: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json", "X-Vestora-CSRF": "1" }, body: body === undefined ? undefined : JSON.stringify(body), credentials: "same-origin" });
    const json = await res.json().catch(() => ({}));
    return res.ok ? { ok: true, data: json as T } : { ok: false, status: res.status, errors: (json as { errors?: string[] }).errors ?? [`Request failed (${res.status})`] };
  } catch { return { ok: false, status: 0, errors: ["Network error"] }; }
}

export async function upload(kind: "image" | "model", file: File): Promise<ApiResult<{ url: string }>> {
  const form = new FormData();
  form.set("kind", kind); form.set("file", file);
  try {
    const res = await fetch("/api/admin/upload", { method: "POST", headers: { "X-Vestora-CSRF": "1" }, body: form, credentials: "same-origin" });
    const json = await res.json().catch(() => ({}));
    return res.ok ? { ok: true, data: json } : { ok: false, status: res.status, errors: (json as { errors?: string[] }).errors ?? ["Upload failed"] };
  } catch { return { ok: false, status: 0, errors: ["Network error"] }; }
}
