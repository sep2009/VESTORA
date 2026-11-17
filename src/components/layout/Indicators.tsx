"use client";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { useCart } from "@/stores/cart-store";
import { useFavorites } from "@/stores/favorites-store";
import { useMounted } from "@/lib/use-mounted";

function Badge({ count }: { count: number }) {
  if (count < 1) return null;
  return <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-4 text-ink">{count}</span>;
}

const linkClass = "relative grid size-11 place-items-center rounded-sm hover:bg-ink/8";

export function CartIndicator() {
  const count = useCart((s) => s.lines.reduce((n, l) => n + l.quantity, 0));
  const shown = useMounted() ? count : 0;
  return (
    <Link href="/cart" className={linkClass} aria-label={`Cart, ${shown} ${shown === 1 ? "item" : "items"}`}>
      <Icon name="bag" /><Badge count={shown} />
    </Link>
  );
}

export function FavoritesIndicator() {
  const count = useFavorites((s) => s.ids.length);
  const shown = useMounted() ? count : 0;
  return (
    <Link href="/favorites" className={linkClass} aria-label={`Favorites, ${shown} saved`}>
      <Icon name="heart" /><Badge count={shown} />
    </Link>
  );
}
