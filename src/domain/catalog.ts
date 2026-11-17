import { z } from "zod";
import { money, productId, slug, variantId } from "./ids";

export const department = z.object({
  id: z.uuid(),
  slug,
  name: z.string().min(1),
  description: z.string().default(""),
  /** Visual theme key used by the 3D showroom for this department's style. */
  themeKey: z.string().min(1),
  sortOrder: z.number().int().default(0),
});
export type Department = z.infer<typeof department>;

export const category = z.object({
  id: z.uuid(),
  slug,
  name: z.string().min(1),
  departmentId: z.uuid(),
});
export type Category = z.infer<typeof category>;

export const collection = z.object({
  id: z.uuid(),
  slug,
  name: z.string().min(1),
  description: z.string().default(""),
});
export type Collection = z.infer<typeof collection>;

export const size = z.object({ code: z.string().min(1), label: z.string().min(1) });
export type Size = z.infer<typeof size>;

export const color = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});
export type Color = z.infer<typeof color>;

export const inventory = z.object({
  variantId,
  quantityAvailable: z.number().int().nonnegative(),
});
export type Inventory = z.infer<typeof inventory>;

export const productVariant = z.object({
  id: variantId,
  productId,
  sku: z.string().min(1),
  size,
  color,
  price: money,
  inventory,
});
export type ProductVariant = z.infer<typeof productVariant>;

export const productAssets = z.object({
  images: z.array(z.url()).default([]),
  /** glTF/GLB model for the 3D viewer, fitting room and showroom. Optional until supplied. */
  modelUrl: z.url().nullable().default(null),
});

export const product = z.object({
  id: productId,
  slug,
  name: z.string().min(1),
  description: z.string().default(""),
  departmentId: z.uuid(),
  categoryId: z.uuid(),
  collectionIds: z.array(z.uuid()).default([]),
  assets: productAssets,
  variants: z.array(productVariant),
  published: z.boolean(),
});
export type Product = z.infer<typeof product>;
