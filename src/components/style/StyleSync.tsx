"use client";
import { useEffect } from "react";
import { call } from "@/components/tryon/tryon-client";
import { useMe } from "@/components/commerce/auth-client";
import { useStyle } from "@/stores/style-store";
import type { Answers, Consent } from "@/modules/style/core";

type Remote = { profile: { answers: Answers; updatedAt: number } | null; consent: Consent };

/** When signed in, the style profile and personalization choices follow the account. The newest copy wins; signed out, everything stays on this device. */
export function StyleSync() {
  const me = useMe(), id = me?.id;
  useEffect(() => {
    if (!id) return;
    let alive = true, timer: ReturnType<typeof setTimeout> | undefined, last = "";
    const sig = () => { const s = useStyle.getState(); return JSON.stringify([s.answers, s.consent]); };
    void call<Remote>("GET", "/api/style/profile").then((r) => {
      if (!alive || !r.ok) return;
      const s = useStyle.getState(), remote = r.data.profile;
      if (remote && (!s.answers || (s.updatedAt ?? 0) < remote.updatedAt)) s.adopt(remote.answers, r.data.consent, remote.updatedAt);
      else if (s.answers) void call("PUT", "/api/style/profile", { answers: s.answers, consent: s.consent });
      last = sig();
    });
    const unsub = useStyle.subscribe(() => {
      const now = sig(); if (now === last) return;
      clearTimeout(timer);
      timer = setTimeout(() => { last = now; const s = useStyle.getState(); if (s.answers) void call("PUT", "/api/style/profile", { answers: s.answers, consent: s.consent }); else void call("DELETE", "/api/style/profile"); }, 600);
    });
    return () => { alive = false; clearTimeout(timer); unsub(); };
  }, [id]);
  return null;
}
