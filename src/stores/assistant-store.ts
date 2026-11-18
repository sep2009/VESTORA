"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { emptyState, type AState, type Answer } from "@/modules/assistant/core";

/** What the stylist may look at. Page context is the page you opened it from; the rest is personal and OFF until you allow it. */
export type Allowed = { profile: boolean; cart: boolean; outfits: boolean; page: boolean };
export type ReplyData = {
  source: "rules" | "provider"; provider: { id: string; label: string; test: boolean } | null; notice: string | null; error: { code: string; message: string } | null;
  answer: Omit<Answer, "departments"> & { departments: unknown[] }; used: Allowed;
};
export type Msg = { id: string; role: "user" | "assistant"; text: string; at: number; data?: ReplyData; failed?: { text: string } };
type State = {
  messages: Msg[]; state: AState; allowed: Allowed; open: boolean; draft: string;
  add: (m: Omit<Msg, "id" | "at">) => string;
  setState: (s: AState) => void; setAllowed: (p: Partial<Allowed>) => void; setOpen: (o: boolean) => void; setDraft: (t: string) => void;
  removeFailed: (id: string) => void;
  /** Wipe the conversation and what the stylist remembered from it. */
  clear: () => void;
};
let n = 0;
const uid = () => `m_${Date.now().toString(36)}${(n++).toString(36)}`;
const MAX = 60, KEEP_DATA = 6;

export const useAssistant = create<State>()(persist((set) => ({
  messages: [], state: emptyState(), allowed: { profile: false, cart: false, outfits: false, page: true }, open: false, draft: "",
  add: (m) => { const id = uid(); set((s) => { const all = [...s.messages, { ...m, id, at: Date.now() }].slice(-MAX); const withData = all.map((x, i) => (x.data && i < all.length - KEEP_DATA && all.slice(i + 1).filter((y) => y.data).length >= KEEP_DATA ? { ...x, data: undefined } : x)); return { messages: withData }; }); return id; },
  setState: (state) => set({ state }), setAllowed: (p) => set((s) => ({ allowed: { ...s.allowed, ...p } })), setOpen: (open) => set({ open }), setDraft: (draft) => set({ draft }),
  removeFailed: (id) => set((s) => ({ messages: s.messages.filter((m) => m.id !== id) })),
  clear: () => set({ messages: [], state: emptyState(), draft: "" }),
}), {
  name: "vestora-stylist-v1", version: 1,
  partialize: (s) => ({ messages: s.messages, state: s.state, allowed: s.allowed }),
  merge: (stored, cur) => {
    const p = stored as Partial<State> | undefined; if (!p || typeof p !== "object") return cur;
    const a = (p.allowed ?? {}) as Partial<Allowed>;
    return { ...cur, messages: Array.isArray(p.messages) ? p.messages.filter((m) => m && typeof m.id === "string" && typeof m.text === "string" && (m.role === "user" || m.role === "assistant")).slice(-MAX) : [], state: p.state && typeof p.state === "object" ? { ...emptyState(), ...p.state } : emptyState(), allowed: { profile: a.profile === true, cart: a.cart === true, outfits: a.outfits === true, page: a.page !== false } };
  },
}));
