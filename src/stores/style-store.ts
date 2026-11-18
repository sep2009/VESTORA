"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { NO_CONSENT, QUESTIONS, answered, emptyAnswers, missingRequired, type Answers, type Consent, type QuestionId } from "@/modules/style/core";

/**
 * The shopper's quiz answers, personalization choices and (only if they allow it) which products they looked at.
 * Kept on this device; when signed in it is also saved to the account (see StyleSync). Product VIEWS never leave the device
 * except as anonymous counts sent with a recommendation request while "views" personalization is on.
 */
type State = {
  answers: Answers | null; updatedAt: number | null; draft: Answers; consent: Consent; views: Record<string, number>;
  setDraft: (patch: Partial<Answers> | ((cur: Answers) => Partial<Answers>)) => void;
  skip: (id: QuestionId) => void;
  startEdit: () => void; startNew: () => void;
  /** Turn the draft into the saved profile. Refused while a required question is unanswered. */
  finish: () => boolean;
  reset: () => void;
  setConsent: (patch: Partial<Consent>) => void;
  recordView: (id: string) => void; clearViews: () => void;
  adopt: (answers: Answers | null, consent: Consent, updatedAt: number | null) => void;
};
const MAX_VIEWS = 200;

export const useStyle = create<State>()(persist((set, get) => ({
  answers: null, updatedAt: null, draft: emptyAnswers(), consent: { ...NO_CONSENT }, views: {},
  setDraft: (p) => set((s) => { const patch = typeof p === "function" ? p(s.draft) : p; const next = { ...s.draft, ...patch }; return { draft: { ...next, skipped: next.skipped.filter((id) => !answered(next, id)) } }; }),
  skip: (id) => set((s) => ({ draft: { ...s.draft, skipped: s.draft.skipped.includes(id) ? s.draft.skipped : [...s.draft.skipped, id] } })),
  startEdit: () => set((s) => ({ draft: s.answers ? structuredClone(s.answers) : emptyAnswers() })),
  startNew: () => set({ draft: emptyAnswers() }),
  finish: () => {
    const d = get().draft; if (missingRequired(d).length) return false;
    const skipped = QUESTIONS.filter((q) => !q.required && !answered(d, q.id)).map((q) => q.id);
    set({ answers: { ...d, skipped }, updatedAt: Date.now() }); return true;
  },
  reset: () => set({ answers: null, updatedAt: null, draft: emptyAnswers() }),
  setConsent: (patch) => set((s) => ({ consent: { ...s.consent, ...patch }, views: patch.views === false ? {} : s.views, updatedAt: s.answers ? Date.now() : s.updatedAt })),
  recordView: (id) => { const s = get(); if (!s.consent.views) return; const v = { ...s.views, [id]: Math.min(50, (s.views[id] ?? 0) + 1) }; const keys = Object.keys(v); if (keys.length > MAX_VIEWS) delete v[keys[0]!]; set({ views: v }); },
  clearViews: () => set({ views: {} }),
  adopt: (answers, consent, updatedAt) => set({ answers, consent, updatedAt, draft: answers ? structuredClone(answers) : emptyAnswers() }),
}), {
  name: "vestora-style-v1", version: 1,
  merge: (stored, cur) => {
    const p = stored as Partial<State> | undefined; if (!p || typeof p !== "object") return cur;
    const c = (p.consent ?? {}) as Partial<Consent>;
    return { ...cur, answers: p.answers && typeof p.answers === "object" ? p.answers : null, updatedAt: typeof p.updatedAt === "number" ? p.updatedAt : null, draft: p.draft && typeof p.draft === "object" ? { ...emptyAnswers(), ...p.draft } : cur.draft, consent: { favorites: c.favorites === true, outfits: c.outfits === true, views: c.views === true, purchases: c.purchases === true }, views: p.views && typeof p.views === "object" ? p.views : {} };
  },
}));
