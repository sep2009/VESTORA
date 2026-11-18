"use client";
import { useMemo, useRef } from "react";
import { AvatarCanvas } from "@/components/outfit/AvatarCanvas";
import type { StageApi } from "@/components/outfit/avatar3d/Stage";
import type { StudioItem } from "@/modules/outfit/core";
import type { AItem } from "@/modules/assistant/core";
import { useOutfits } from "@/stores/outfit-store";

/** The outfit on the Outfit Studio avatar (generic preview garments in each piece's chosen color; see docs/OUTFIT_STUDIO.md). */
export function AvatarPreview({ items }: { items: { item: AItem; color: string | null }[] }) {
  const avatar = useOutfits((s) => s.avatar), api = useRef<StageApi | null>(null);
  const worn = useMemo(() => items.map(({ item, color }) => ({ slot: item.slot, item: { id: item.id, kind: item.kind, slot: item.slot, bagStyle: item.bagStyle } as unknown as StudioItem, colorHex: item.colors.find((c) => c.name === color)?.hex ?? item.colors[0]?.hex ?? "#8a8a8a" })), [items]);
  return (
    <div data-testid="avatar-preview">
      <div className="h-72 overflow-hidden rounded-md border border-line bg-[#e9e6df] sm:h-96"><AvatarCanvas avatar={avatar} worn={worn} apiRef={api} spin={false} /></div>
      <div className="mt-2 flex flex-wrap gap-2">{(["front", "back", "left", "right"] as const).map((v) => <button key={v} className="min-h-9 rounded-sm border border-line px-3 text-sm hover:border-ink" onClick={() => api.current?.view(v)}>{v === "front" ? "Front" : v === "back" ? "Back" : v === "left" ? "Left" : "Right"}</button>)}<button className="min-h-9 rounded-sm border border-line px-3 text-sm hover:border-ink" onClick={() => api.current?.reset()}>Reset</button></div>
      <p className="mt-1 text-xs text-mute">Preview mode: a generic mannequin and generic garment shapes in each product’s color. It does not show the real cut or fit.</p>
    </div>
  );
}
