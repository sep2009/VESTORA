import { z } from "zod";

/** The nine physical departments of the mall. Every product belongs to exactly one. */
export const DEPARTMENTS = ["sportswear", "sneakers", "streetwear", "luxury", "casual", "formal", "denim", "accessories", "new-arrivals"] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const CATEGORIES = ["t-shirts", "shirts", "hoodies", "jackets", "coats", "dresses", "trousers", "jeans", "suits", "sneakers", "bags", "watches", "eyewear"] as const;
export type Category = (typeof CATEGORIES)[number];

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const money = z.object({ amount: z.number().int().nonnegative(), currency: z.string().length(3) });
export type Money = z.infer<typeof money>;

/**
 * Where a record's facts come from. Only "official", "affiliate-feed" and "manual-verified" records are
 * treated as real. "demo" records are test data: they are labelled everywhere, cannot be bought and are never
 * presented as authentic.
 */
export const source = z.object({
  kind: z.enum(["official", "affiliate-feed", "manual-verified", "demo"]),
  retailer: z.string().nullable(),
  /** Official product page or authorised retailer / affiliate link. Required for every non-demo record. */
  url: z.url().nullable(),
  retrievedAt: z.iso.date().nullable(),
});

export const image = z.object({
  url: z.string().min(1),
  alt: z.string().min(1),
  credit: z.string().nullable(),
  /** Licence or permission under which the image may be shown. Required for non-demo records. */
  license: z.string().nullable(),
});

export const brand = z.object({ slug, name: z.string().min(1), demo: z.boolean().default(false), website: z.url().nullable().default(null) });
export type Brand = z.infer<typeof brand>;

export const product = z.object({
  /** Stable, never reused. Real records should use the provider's id, e.g. "awin:12345". */
  id: z.string().min(3),
  slug,
  name: z.string().min(1),
  brand: slug,
  department: z.enum(DEPARTMENTS),
  category: z.enum(CATEGORIES),
  description: z.string(),
  images: z.array(image),
  price: money.nullable(),
  /** Sizes are only offered (and filterable) when `verified` is true. */
  sizes: z.object({ values: z.array(z.string()), verified: z.boolean() }).nullable().default(null),
  colors: z.array(z.object({ name: z.string(), hex: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable() })).default([]),
  colorsVerified: z.boolean().default(false),
  availability: z.enum(["in_stock", "out_of_stock", "unknown"]),
  source,
}).superRefine((p, ctx) => {
  if (p.source.kind === "demo") return;
  const need = (ok: boolean, msg: string) => { if (!ok) ctx.addIssue({ code: "custom", message: msg }); };
  need(!!p.source.url, "non-demo products need a source url");
  need(!!p.price, "non-demo products need a verified price");
  need(p.images.length > 0, "non-demo products need at least one image");
  need(p.images.every((i) => !!i.license), "non-demo product images need a licence");
});
export type Product = z.infer<typeof product>;

export const catalogFile = z.object({ brands: z.array(brand).default([]), products: z.array(z.unknown()) });

export const isDemo = (p: Pick<Product, "source">) => p.source.kind === "demo";
/** Only real, sourced records may be bought through their source link. */
export const isPurchasable = (p: Product) => !isDemo(p) && !!p.source.url && p.availability !== "out_of_stock";
