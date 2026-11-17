"use client";
import { useCart } from "@/stores/cart-store";

export default function CartPage() {
  const lines = useCart((s) => s.lines);
  if (lines.length === 0) return <p className="text-neutral-400">Your cart is empty.</p>;
  return (
    <ul className="space-y-2">
      {lines.map((l) => <li key={l.variantId}>Variant {l.variantId} × {l.quantity}</li>)}
    </ul>
  );
}
