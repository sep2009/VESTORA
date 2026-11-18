"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { validAvatar, type AvatarConfig, type Picks } from "@/modules/outfit/core";

/** Saved AVATAR PREVIEW results. They are configurations (avatar + catalog product ids + choices), stored in this browser only; no images. */
export type AvatarResult = { id: string; at: number; avatar: AvatarConfig; picks: Picks; label: string };
type State = { avatarResults: AvatarResult[]; saveAvatar: (r: Omit<AvatarResult, "id" | "at">) => boolean; removeAvatar: (id: string) => void; clearAvatar: () => void };
const MAX = 20;
export const useTryOnResults = create<State>()(persist((set, get) => ({
  avatarResults: [],
  saveAvatar: (r) => { if (get().avatarResults.length >= MAX || Object.keys(r.picks).length === 0) return false; set((s) => ({ avatarResults: [{ ...r, id: `ar_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, at: Date.now() }, ...s.avatarResults] })); return true; },
  removeAvatar: (id) => set((s) => ({ avatarResults: s.avatarResults.filter((x) => x.id !== id) })),
  clearAvatar: () => set({ avatarResults: [] }),
}), {
  name: "vestora-tryon-v1", version: 1,
  merge: (stored, cur) => { const p = stored as Partial<State> | undefined; return { ...cur, avatarResults: Array.isArray(p?.avatarResults) ? p!.avatarResults!.filter((o) => o && typeof o.id === "string" && validAvatar(o.avatar) && o.picks && typeof o.picks === "object").slice(0, MAX) : [] }; },
}));
