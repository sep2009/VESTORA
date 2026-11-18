"use client";
import { useEffect, useState } from "react";

export type Me = { id: string; email: string; name: string } | null;
export const AUTH_EVENT = "vestora-auth-changed";

/** The signed-in customer (or null), re-read whenever someone signs in or out. `undefined` while loading. */
export function useMe(): Me | undefined {
  const [me, setMe] = useState<Me | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    const load = () => fetch("/api/auth/me", { credentials: "same-origin" }).then((r) => r.json()).then((d: { user: Me }) => { if (alive) setMe(d.user); }).catch(() => { if (alive) setMe(null); });
    void load();
    window.addEventListener(AUTH_EVENT, load);
    return () => { alive = false; window.removeEventListener(AUTH_EVENT, load); };
  }, []);
  return me;
}
export const announceAuthChange = () => window.dispatchEvent(new Event(AUTH_EVENT));

export async function post<T = unknown>(method: "POST" | "PUT" | "DELETE", url: string, body?: unknown): Promise<{ ok: true; data: T } | { ok: false; status: number; errors: string[] }> {
  try {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json", "X-Vestora-CSRF": "1" }, body: body === undefined ? undefined : JSON.stringify(body), credentials: "same-origin" });
    const json = await res.json().catch(() => ({}));
    return res.ok ? { ok: true, data: json as T } : { ok: false, status: res.status, errors: (json as { errors?: string[] }).errors ?? [`Request failed (${res.status})`] };
  } catch { return { ok: false, status: 0, errors: ["Network error. Check your connection and try again."] }; }
}
