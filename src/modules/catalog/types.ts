import { z } from "zod";

/** The nine physical departments of the mall. Each is a room, so the set is fixed; their names/visibility are editable. */
export const DEPARTMENTS = ["sportswear", "sneakers", "streetwear", "luxury", "casual", "formal", "denim", "accessories", "new-arrivals"] as const;
export type Department = (typeof DEPARTMENTS)[number];

/** How a product is drawn in the 3D mall. A category picks one; products inherit it. */
export const ITEM_KINDS = ["tee", "shirt", "hoodie", "jacket", "coat", "dress", "suit", "trousers", "sneaker", "bag", "watch", "glasses"] as const;
export type ItemKindName = (typeof ITEM_KINDS)[number];

export const AUDIENCES = ["men", "women", "unisex"] as const;
export type Audience = (typeof AUDIENCES)[number];

export const slug = z.string().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "lowercase letters, numbers and dashes only");
export const money = z.object({ amount: z.number().int().nonnegative().max(100_000_000), currency: z.string().length(3).regex(/^[A-Z]{3}$/) });
export type Money = z.infer<typeof money>;

/**
 * Where a record's facts come from. Only "official", "affiliate-feed" and "manual-verified" records are
 * treated as real. "demo" records are test data: labelled everywhere, never presented as authentic or live stock.
 */
export const source = z.object({
  kind: z.enum(["official", "affiliate-feed", "manual-verified", "demo"]),
  retailer: z.string().max(120).nullable(),
  url: z.url().nullable(),
  retrievedAt: z.iso.date().nullable(),
});

export const image = z.object({
  /** Absolute https URL, or an uploaded file served by /api/uploads/… */
  url: z.string().min(1).max(500).refine((u) => /^https:\/\//.test(u) || u.startsWith("/api/uploads/") || u.startsWith("/api/demo-image/"), "image url must be https or an uploaded/demo path"),
  alt: z.string().min(1).max(200),
  credit: z.string().max(200).nullable(),
  license: z.string().max(200).nullable(),
  /** Variant colour this photo shows (matches a variant colour name). Null = shows the product in general. */
  color: z.string().max(40).nullable().default(null),
});

/** A GLB/GLTF model for the product. Only shown as "this product" when it really is that product's model. */
export const model3d = z.object({
  url: z.string().min(1).max(500).refine((u) => /^https:\/\//.test(u) || u.startsWith("/api/uploads/"), "model url must be https or an uploaded path"),
  license: z.string().max(200).nullable(),
});

export const brand = z.object({ slug, name: z.string().min(1).max(120), demo: z.boolean().default(false), website: z.url().nullable().default(null) });
export type Brand = z.infer<typeof brand>;

export const category = z.object({
  slug,
  name: z.string().min(1).max(80),
  /** Which 3D shape represents products of this category. */
  kind: z.enum(ITEM_KINDS),
  /** Optional grouping (e.g. watches → accessories). */
  parent: slug.nullable().default(null),
});
export type Category = z.infer<typeof category>;

export const collection = z.object({ slug, name: z.string().min(1).max(80), description: z.string().max(500).default("") });
export type Collection = z.infer<typeof collection>;

export const departmentMeta = z.object({
  slug: z.enum(DEPARTMENTS),
  name: z.string().min(1).max(60),
  tagline: z.string().max(120).default(""),
  /** When false the department's room stays but none of its products are placed in the mall. */
  showInMall: z.boolean().default(true),
});
export type DepartmentMeta = z.infer<typeof departmentMeta>;

export const variant = z.object({
  sku: z.string().min(1).max(60),
  size: z.string().max(20).nullable(),
  color: z.string().max(40).nullable(),
  stock: z.number().int().min(0).max(1_000_000),
});
export type Variant = z.infer<typeof variant>;

export const product = z.object({
  /** Stable, never reused. Real records should use the provider's id, e.g. "awin:12345". */
  id: z.string().min(3).max(80),
  slug,
  name: z.string().min(1).max(160),
  brand: slug,
  department: z.enum(DEPARTMENTS),
  category: slug,
  audience: z.enum(AUDIENCES).default("unisex"),
  description: z.string().max(5000),
  collections: z.array(slug).default([]),
  tags: z.array(z.string().min(1).max(30)).max(30).default([]),
  materials: z.array(z.string().min(1).max(60)).max(10).default([]),
  featured: z.boolean().default(false),
  images: z.array(image).max(12),
  model3d: model3d.nullable().default(null),
  price: money.nullable(),
  /** Sale price, strictly lower than `price`, same currency. */
  salePrice: money.nullable().default(null),
  /** Stock per size/colour. When present, sizes, colours, stock and availability are derived from it. */
  variants: z.array(variant).max(200).default([]),
  /** Used only when there are no variants. */
  sizes: z.object({ values: z.array(z.string().max(20)).max(40), verified: z.boolean() }).nullable().default(null),
  colors: z.array(z.object({ name: z.string().max(40), hex: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable() })).max(40).default([]),
  colorsVerified: z.boolean().default(false),
  availability: z.enum(["in_stock", "out_of_stock", "unknown"]),
  /** Whether the product is shown in the 3D mall at all. */
  showInMall: z.boolean().default(true),
  /** Shipping and returns text, shown only when an admin configured it. */
  shipping: z.object({ summary: z.string().min(1).max(300), returns: z.string().max(300).nullable().default(null) }).nullable().default(null),
  source,
}).superRefine((p, ctx) => {
  const bad = (msg: string, path?: string[]) => ctx.addIssue({ code: "custom", message: msg, path });
  if (p.salePrice) {
    if (!p.price) bad("a sale price needs a regular price", ["salePrice"]);
    else if (p.salePrice.currency !== p.price.currency) bad("sale price must use the same currency", ["salePrice"]);
    else if (p.salePrice.amount >= p.price.amount) bad("sale price must be lower than the regular price", ["salePrice"]);
  }
  const skus = p.variants.map((v) => v.sku);
  if (new Set(skus).size !== skus.length) bad("variant SKUs must be unique", ["variants"]);
  if (p.source.kind === "demo") return;
  if (!p.source.url) bad("non-demo products need a source url", ["source", "url"]);
  if (!p.price) bad("non-demo products need a verified price", ["price"]);
  if (p.images.length === 0) bad("non-demo products need at least one image", ["images"]);
  if (p.images.some((i) => !i.license)) bad("non-demo product images need a licence", ["images"]);
});
export type Product = z.infer<typeof product>;

/** Sizes, colours, stock and availability for display. Derived from variants when there are any. */
export function resolveStock(p: Product): { sizes: string[]; sizesVerified: boolean; colors: { name: string; hex: string | null }[]; colorsVerified: boolean; stock: number | null; availability: Product["availability"] } {
  if (p.variants.length === 0) {
    return { sizes: p.sizes?.values ?? [], sizesVerified: !!p.sizes?.verified, colors: p.colors, colorsVerified: p.colorsVerified, stock: null, availability: p.availability };
  }
  const stock = p.variants.reduce((n, v) => n + v.stock, 0);
  const sizes = [...new Set(p.variants.map((v) => v.size).filter((s): s is string => !!s))];
  const names = [...new Set(p.variants.map((v) => v.color).filter((c): c is string => !!c))];
  const hexOf = (n: string) => p.colors.find((c) => c.name === n)?.hex ?? null;
  return { sizes, sizesVerified: sizes.length > 0, colors: names.map((n) => ({ name: n, hex: hexOf(n) })), colorsVerified: names.length > 0, stock, availability: stock > 0 ? "in_stock" : "out_of_stock" };
}

export const isDemo = (p: Pick<Product, "source">) => p.source.kind === "demo";
/** Price a shopper pays: the sale price when there is one. */
export const effectivePrice = (p: Pick<Product, "price" | "salePrice">): Money | null => p.salePrice ?? p.price;
export const discountPercent = (p: Pick<Product, "price" | "salePrice">) => (p.price && p.salePrice ? Math.round((1 - p.salePrice.amount / p.price.amount) * 100) : 0);
/** Only real, sourced records that are available may be bought through their source link. */
export const isPurchasable = (p: Product) => !isDemo(p) && !!p.source.url && resolveStock(p).availability !== "out_of_stock";
