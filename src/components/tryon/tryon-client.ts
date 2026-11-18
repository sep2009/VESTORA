import type { JobView } from "@/modules/tryon/core";

export type TryOnConfig = {
  available: boolean; code: string; message: string | null;
  provider: { id: string; label: string; test: boolean; retentionNote: string } | null;
  limits: { maxMb: number; minSide: number; maxSide: number; retention: { photoMinutes: number; resultHours: number; savedDays: number } };
  consentVersion: string; signedIn: boolean; usage: { used: number; limit: number } | null;
};
type Res<T> = { ok: true; data: T } | { ok: false; status: number; error: string };
/** Same-origin calls with the CSRF header. Errors become plain messages. */
export async function call<T>(method: string, path: string, body?: FormData | object): Promise<Res<T>> {
  try {
    const isForm = typeof FormData !== "undefined" && body instanceof FormData;
    const res = await fetch(path, { method, headers: { "X-Vestora-CSRF": "1", ...(body && !isForm ? { "Content-Type": "application/json" } : {}) }, body: body ? (isForm ? (body as FormData) : JSON.stringify(body)) : undefined, cache: "no-store" });
    const data = (await res.json().catch(() => ({}))) as { errors?: string[] } & Record<string, unknown>;
    return res.ok ? { ok: true, data: data as T } : { ok: false, status: res.status, error: data.errors?.[0] ?? "Something went wrong. Please try again." };
  } catch { return { ok: false, status: 0, error: "Could not reach the server. Check your connection and try again." }; }
}
export type { JobView };
