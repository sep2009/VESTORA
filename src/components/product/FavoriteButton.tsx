"use client";
import { Icon } from "@/components/ui/Icon";
import { useFavorites } from "@/stores/favorites-store";
import { useToasts } from "@/stores/toast-store";
import { useMounted } from "@/lib/use-mounted";

export function FavoriteButton({ productId, name, className = "" }: { productId: string; name: string; className?: string }) {
  const toggle = useFavorites((s) => s.toggle);
  const saved = useFavorites((s) => s.ids.includes(productId));
  const push = useToasts((s) => s.push);
  const active = useMounted() && saved;
  return (
    <button type="button" aria-pressed={active} aria-label={`${active ? "Remove" : "Save"} ${name} ${active ? "from" : "to"} favorites`}
      onClick={() => push(toggle(productId) ? `Saved ${name}` : `Removed ${name}`, "success")}
      className={`grid size-10 place-items-center rounded-full bg-surface/90 shadow-card hover:bg-surface ${className}`}>
      <Icon name="heart" size={18} fill={active ? "currentColor" : "none"} className={active ? "text-accent-ink" : ""} />
    </button>
  );
}
