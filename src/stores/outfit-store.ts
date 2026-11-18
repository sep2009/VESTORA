"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_AVATAR, validAvatar, type AvatarConfig, type Picks } from "@/modules/outfit/core";

/** An outfit is the avatar choice plus product ids and variant choices. Names, prices and stock are always read from the catalog. */
export type SavedOutfit = { id: string; name: string; avatar: AvatarConfig; picks: Picks; favorite: boolean; createdAt: number; updatedAt: number };
const MAX_SAVED = 50;
const clean = (n: string) => n.replace(/\s+/g, " ").trim().slice(0, 60);
const uid = () => `o_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

type State = {
  avatar: AvatarConfig; picks: Picks; name: string;
  /** Id of the saved outfit being edited, or null for a new unsaved outfit. */
  activeId: string | null;
  saved: SavedOutfit[];
  setAvatar: (patch: Partial<AvatarConfig>) => void;
  setPicks: (picks: Picks) => void;
  setName: (name: string) => void;
  /** Start from nothing. */
  newOutfit: () => void;
  /** Save the working outfit: updates the active saved outfit or creates one. Returns its id, or null when the outfit is empty or the limit is reached. */
  save: (name?: string) => string | null;
  saveAsNew: (name?: string) => string | null;
  /** Save an outfit that was built elsewhere (the stylist) without touching the outfit being edited. */
  saveFrom: (avatar: AvatarConfig, picks: Picks, name: string) => string | null;
  load: (id: string, over?: { avatar?: AvatarConfig; picks?: Picks }) => boolean;
  rename: (id: string, name: string) => void;
  duplicate: (id: string) => string | null;
  remove: (id: string) => void;
  toggleFavorite: (id: string) => void;
  /** Replace the working outfit with something that arrived from outside (a share link). */
  adopt: (avatar: AvatarConfig, picks: Picks, name: string) => void;
};

export const useOutfits = create<State>()(
  persist(
    (set, get) => ({
      avatar: DEFAULT_AVATAR, picks: {}, name: "", activeId: null, saved: [],
      setAvatar: (patch) => set((s) => ({ avatar: { ...s.avatar, ...patch } })),
      setPicks: (picks) => set({ picks }),
      setName: (name) => set({ name: name.slice(0, 60) }),
      newOutfit: () => set({ picks: {}, name: "", activeId: null }),
      save: (name) => {
        const s = get(); if (Object.keys(s.picks).length === 0) return null;
        const nm = clean(name ?? s.name) || `Outfit ${s.saved.length + 1}`;
        const cur = s.activeId ? s.saved.find((o) => o.id === s.activeId) : undefined;
        if (cur) { set({ name: nm, saved: s.saved.map((o) => (o.id === cur.id ? { ...o, name: nm, avatar: s.avatar, picks: s.picks, updatedAt: Date.now() } : o)) }); return cur.id; }
        return get().saveAsNew(nm);
      },
      saveAsNew: (name) => {
        const s = get(); if (Object.keys(s.picks).length === 0 || s.saved.length >= MAX_SAVED) return null;
        const id = uid(), nm = clean(name ?? s.name) || `Outfit ${s.saved.length + 1}`, now = Date.now();
        set({ activeId: id, name: nm, saved: [{ id, name: nm, avatar: s.avatar, picks: s.picks, favorite: false, createdAt: now, updatedAt: now }, ...s.saved] });
        return id;
      },
      saveFrom: (avatar, picks, name) => {
        const s = get(); if (Object.keys(picks).length === 0 || s.saved.length >= MAX_SAVED) return null;
        const id = uid(), now = Date.now(), nm = clean(name) || `Outfit ${s.saved.length + 1}`;
        set({ saved: [{ id, name: nm, avatar, picks, favorite: false, createdAt: now, updatedAt: now }, ...s.saved] }); return id;
      },
      load: (id, over) => {
        const o = get().saved.find((x) => x.id === id); if (!o) return false;
        set({ activeId: o.id, name: o.name, avatar: over?.avatar ?? o.avatar, picks: over?.picks ?? o.picks }); return true;
      },
      rename: (id, name) => { const nm = clean(name); if (!nm) return; set((s) => ({ name: s.activeId === id ? nm : s.name, saved: s.saved.map((o) => (o.id === id ? { ...o, name: nm, updatedAt: Date.now() } : o)) })); },
      duplicate: (id) => {
        const s = get(), o = s.saved.find((x) => x.id === id); if (!o || s.saved.length >= MAX_SAVED) return null;
        const nid = uid(), now = Date.now();
        set({ saved: [{ ...o, id: nid, name: clean(`${o.name} copy`), picks: structuredClone(o.picks), favorite: false, createdAt: now, updatedAt: now }, ...s.saved] }); return nid;
      },
      remove: (id) => set((s) => ({ saved: s.saved.filter((o) => o.id !== id), activeId: s.activeId === id ? null : s.activeId })),
      toggleFavorite: (id) => set((s) => ({ saved: s.saved.map((o) => (o.id === id ? { ...o, favorite: !o.favorite } : o)) })),
      adopt: (avatar, picks, name) => set({ avatar, picks, name: clean(name), activeId: null }),
    }),
    {
      name: "vestora-outfits-v1", version: 1,
      partialize: (s) => ({ avatar: s.avatar, picks: s.picks, name: s.name, activeId: s.activeId, saved: s.saved }),
      // never trust stored data: drop anything malformed
      merge: (stored, cur) => {
        const p = stored as Partial<State> | undefined; if (!p || typeof p !== "object") return cur;
        const saved = Array.isArray(p.saved) ? p.saved.filter((o) => o && typeof o.id === "string" && typeof o.name === "string" && validAvatar(o.avatar) && o.picks && typeof o.picks === "object").slice(0, MAX_SAVED) : [];
        return { ...cur, avatar: validAvatar(p.avatar) ? p.avatar : cur.avatar, picks: p.picks && typeof p.picks === "object" ? p.picks : {}, name: typeof p.name === "string" ? p.name.slice(0, 60) : "", activeId: typeof p.activeId === "string" && saved.some((o) => o.id === p.activeId) ? p.activeId : null, saved };
      },
    },
  ),
);
