"use client";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState, Spinner } from "@/components/feedback/States";
import { Button } from "@/components/ui/Button";
import { ProductCard } from "@/components/product/ProductCard";
import type { IndexItem } from "@/server/catalog/index-data";
import { useFavorites } from "@/stores/favorites-store";
import { useMounted } from "@/lib/use-mounted";

export default function FavoritesPage() {
  const ids = useFavorites((s) => s.ids);
  const mounted = useMounted();
  const [items, setItems] = useState<IndexItem[] | null>(null);
  useEffect(() => { fetch("/api/catalog").then((r) => r.json()).then((d: { items: IndexItem[] }) => setItems(d.items)).catch(() => setItems([])); }, []);
  const mine = (items ?? []).filter((i) => ids.includes(i.id));
  return (
    <PageShell eyebrow="Favorites" title="Saved pieces" intro="Saved by catalog product id, so the same products show in the mall and the shop.">
      {!mounted || items === null ? <Spinner /> : mine.length === 0 ? (
        <EmptyState title="No favorites yet" icon="heart" action={<Button href="/shop" variant="secondary">Browse the shop</Button>}>Tap the heart on any product to save it.</EmptyState>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4">{mine.map((it) => <li key={it.id}><ProductCard item={it} /></li>)}</ul>
      )}
    </PageShell>
  );
}
