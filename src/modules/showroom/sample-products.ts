import type { SampleProduct, ZoneSlug, ItemKind } from "./types";

/**
 * DEVELOPMENT SAMPLES ONLY. These are placeholders so the showroom is not empty
 * before the catalog is connected. They are not real products, have no price and
 * cannot be bought. Names are prefixed "Sample" everywhere they are shown.
 */
const s = (department: ZoneSlug, n: number, name: string, kind: ItemKind, color: string): SampleProduct =>
  ({ id: `sample-${department}-${n}`, name: `Sample · ${name}`, department, kind, color });

export const SAMPLE_PRODUCTS: readonly SampleProduct[] = [
  s("luxury", 1, "Cashmere Overcoat", "coat", "#2b2433"), s("luxury", 2, "Silk Evening Dress", "dress", "#7a1f2e"),
  s("luxury", 3, "Wool Blazer", "jacket", "#1c1c1c"), s("luxury", 4, "Velvet Jacket", "jacket", "#14452f"),
  s("luxury", 5, "Leather Handbag", "bag", "#a5651f"), s("luxury", 6, "Camel Coat", "coat", "#b5864b"),
  s("luxury", 7, "Pleated Dress", "dress", "#d8c8a0"), s("luxury", 8, "Gold Watch", "watch", "#d4af37"),

  s("streetwear", 1, "Oversized Hoodie", "hoodie", "#d6ff3d"), s("streetwear", 2, "Graphic Tee", "tee", "#ff3d81"),
  s("streetwear", 3, "Cargo Trousers", "trousers", "#4b5320"), s("streetwear", 4, "High-top Sneaker", "sneaker", "#ffffff"),
  s("streetwear", 5, "Puffer Jacket", "jacket", "#3b6cff"), s("streetwear", 6, "Heavy Hoodie", "hoodie", "#1e1e1e"),
  s("streetwear", 7, "Runner Sneaker", "sneaker", "#ff7a1a"), s("streetwear", 8, "Boxy Tee", "tee", "#e9e9e4"),

  s("minimal", 1, "Linen Shirt", "shirt", "#e8e3d8"), s("minimal", 2, "Wide Trousers", "trousers", "#b8b5ad"),
  s("minimal", 3, "Boxy Tee", "tee", "#f4f4f0"), s("minimal", 4, "Wool Coat", "coat", "#8b8780"),
  s("minimal", 5, "Knit Dress", "dress", "#cfcac0"), s("minimal", 6, "Poplin Shirt", "shirt", "#ffffff"),
  s("minimal", 7, "Leather Sneaker", "sneaker", "#f2f0ea"), s("minimal", 8, "Tote Bag", "bag", "#2b2b2b"),

  s("casual", 1, "Cotton Tee", "tee", "#5f9c6d"), s("casual", 2, "Denim Jacket", "jacket", "#4a6fa5"),
  s("casual", 3, "Relaxed Hoodie", "hoodie", "#e0a458"), s("casual", 4, "Chino Trousers", "trousers", "#c2a878"),
  s("casual", 5, "Summer Dress", "dress", "#f0c75e"), s("casual", 6, "Striped Shirt", "shirt", "#7aa7d1"),
  s("casual", 7, "Canvas Sneaker", "sneaker", "#e9e2d0"), s("casual", 8, "Everyday Tee", "tee", "#d96f5a"),

  s("formal", 1, "Navy Suit", "suit", "#1b2a49"), s("formal", 2, "Charcoal Suit", "suit", "#3a3a40"),
  s("formal", 3, "Evening Gown", "dress", "#5b1226"), s("formal", 4, "Dress Shirt", "shirt", "#f6f6f2"),
  s("formal", 5, "Black Suit", "suit", "#141414"), s("formal", 6, "Tuxedo Jacket", "jacket", "#0d0d12"),
  s("formal", 7, "Satin Gown", "dress", "#1f3d63"), s("formal", 8, "Wool Trousers", "trousers", "#2e2e33"),

  s("accessories", 1, "Leather Sneaker", "sneaker", "#f0ede6"), s("accessories", 2, "Shoulder Bag", "bag", "#8c3b2a"),
  s("accessories", 3, "Steel Watch", "watch", "#b9bcc1"), s("accessories", 4, "Round Glasses", "glasses", "#2a2a2a"),
  s("accessories", 5, "Crossbody Bag", "bag", "#1f4f5a"), s("accessories", 6, "Gold Watch", "watch", "#d4af37"),
  s("accessories", 7, "Court Sneaker", "sneaker", "#2f6b4f"), s("accessories", 8, "Sunglasses", "glasses", "#101010"),

  s("new-arrivals", 1, "Season Opener Coat", "coat", "#ff5a1f"), s("new-arrivals", 2, "Launch Dress", "dress", "#f2d03b"),
  s("new-arrivals", 3, "Debut Jacket", "jacket", "#2b6cff"), s("new-arrivals", 4, "Fresh Sneaker", "sneaker", "#ffffff"),
  s("new-arrivals", 5, "Capsule Hoodie", "hoodie", "#7a5cff"), s("new-arrivals", 6, "New Tee", "tee", "#ff8fb3"),
  s("new-arrivals", 7, "Fresh Bag", "bag", "#17a085"), s("new-arrivals", 8, "Fresh Trousers", "trousers", "#ece4d2"),
];

export function getSample(id: string): SampleProduct | undefined {
  return SAMPLE_PRODUCTS.find((p) => p.id === id);
}
