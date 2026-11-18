"use client";
import { useEffect } from "react";
import { useFavorites } from "@/stores/favorites-store";
import { post, useMe } from "./auth-client";

/** When signed in, favorites follow the account: this device's list is merged into the account once, then changes are saved. Signed out, they stay on the device. */
export function FavoritesSync() {
  const me = useMe();
  const id = me?.id;
  useEffect(() => {
    if (!id) return;
    let alive = true, timer: ReturnType<typeof setTimeout> | undefined, last = "";
    void post<{ ids: string[] }>("POST", "/api/account/favorites", { ids: useFavorites.getState().ids }).then((r) => {
      if (!alive || !r.ok) return;
      useFavorites.setState({ ids: r.data.ids }); last = JSON.stringify(r.data.ids);
    });
    const unsub = useFavorites.subscribe((s) => {
      const now = JSON.stringify(s.ids);
      if (now === last) return;
      clearTimeout(timer);
      timer = setTimeout(() => { last = now; void post("PUT", "/api/account/favorites", { ids: s.ids }); }, 500);
    });
    return () => { alive = false; clearTimeout(timer); unsub(); };
  }, [id]);
  return null;
}
