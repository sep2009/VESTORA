import "server-only";
import { randomBytes } from "node:crypto";
import { brand, category, collection, departmentMeta, effectivePrice, product, resolveStock, type Brand, type Category, type Collection, type DepartmentMeta, type Product } from "@/modules/catalog/types";
import { slotRecord, validateSlots, type SlotRecord } from "@/modules/showroom/slots";
import { fail, mutate, ok, readStore, type Result, type StoreData } from "./db";
import { productClass } from "@/modules/showroom/assign";
import { kindForCategory } from "@/modules/catalog/kinds";
import { z } from "zod";

/** Repository: every write is validated and keeps references consistent (a product can never point at a missing brand, category or collection). */
export const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
const issues = (e: z.ZodError) => e.issues.map((i) => `${i.path.join(".") || "record"}: ${i.message}`);

/* ───────── reads ───────── */
export const listProducts = () => readStore().data.products;
export const getProduct = (id: string) => readStore().data.products.find((p) => p.id === id);

/* ───────── products ───────── */
export type ProductInput = Omit<Partial<Product>, "id" | "slug"> & { id?: string; slug?: string };

/** Variants decide availability, so it can never disagree with the stock numbers. */
function normalise(p: Product): Product {
  const r = resolveStock(p);
  return { ...p, availability: p.variants.length ? r.availability : p.availability, sizes: p.variants.length ? { values: r.sizes, verified: r.sizesVerified } : p.sizes, colorsVerified: p.variants.length ? r.colorsVerified : p.colorsVerified };
}

function checkRefs(d: StoreData, p: Product): string[] {
  const errs: string[] = [];
  if (!d.brands.some((b) => b.slug === p.brand)) errs.push(`brand: unknown brand "${p.brand}"`);
  if (!d.categories.some((c) => c.slug === p.category)) errs.push(`category: unknown category "${p.category}"`);
  p.collections.forEach((c) => { if (!d.collections.some((x) => x.slug === c)) errs.push(`collections: unknown collection "${c}"`); });
  return errs;
}

export function createProduct(actor: string, input: ProductInput): Promise<Result<Product>> {
  return mutate(actor, `product.create ${input.name ?? ""}`, (d) => {
    const id = input.id ?? `p-${randomBytes(5).toString("hex")}`;
    const slug = input.slug || slugify(String(input.name ?? ""));
    if (d.products.some((p) => p.id === id)) return fail(409, `id: "${id}" already exists`);
    if (d.products.some((p) => p.slug === slug)) return fail(409, `slug: "${slug}" is already used`);
    const parsed = product.safeParse({ ...input, id, slug });
    if (!parsed.success) return fail(422, ...issues(parsed.error));
    const p = normalise(parsed.data);
    const refs = checkRefs(d, p);
    if (refs.length) return fail(422, ...refs);
    d.products.push(p);
    return ok(p);
  });
}

/** `id` never changes. `slug` may, as long as it stays unique. */
export function updateProduct(actor: string, id: string, patch: ProductInput): Promise<Result<Product>> {
  return mutate(actor, `product.update ${id}`, (d) => {
    const i = d.products.findIndex((p) => p.id === id);
    if (i < 0) return fail(404, `product "${id}" not found`);
    const merged = { ...d.products[i]!, ...patch, id };
    if (d.products.some((p) => p.id !== id && p.slug === merged.slug)) return fail(409, `slug: "${merged.slug}" is already used`);
    const parsed = product.safeParse(merged);
    if (!parsed.success) return fail(422, ...issues(parsed.error));
    const p = normalise(parsed.data);
    const refs = checkRefs(d, p);
    if (refs.length) return fail(422, ...refs);
    d.products[i] = p;
    // a pin is dropped if the edit made it invalid (department/category changed, hidden from mall)
    const slotId = d.showroom.assignments[id];
    if (slotId) { const slot = d.showroom.slots.find((s) => s.id === slotId); if (!slot || !slot.visible || slot.department !== p.department || !p.showInMall) delete d.showroom.assignments[id]; }
    return ok(p);
  });
}

export function deleteProduct(actor: string, id: string): Promise<Result<{ id: string }>> {
  return mutate(actor, `product.delete ${id}`, (d) => {
    if (!d.products.some((p) => p.id === id)) return fail(404, `product "${id}" not found`);
    d.products = d.products.filter((p) => p.id !== id);
    delete d.showroom.assignments[id];
    return ok({ id });
  });
}

/** Set the stock of one variant (SKU). Availability follows automatically. */
export function setStock(actor: string, id: string, sku: string, stock: number): Promise<Result<Product>> {
  return mutate(actor, `inventory ${id} ${sku}=${stock}`, (d) => {
    const i = d.products.findIndex((p) => p.id === id);
    if (i < 0) return fail(404, `product "${id}" not found`);
    const v = d.products[i]!.variants.find((x) => x.sku === sku);
    if (!v) return fail(404, `variant "${sku}" not found`);
    if (!Number.isInteger(stock) || stock < 0 || stock > 1_000_000) return fail(422, "stock must be a whole number from 0 to 1,000,000");
    v.stock = stock;
    d.products[i] = normalise(d.products[i]!);
    return ok(d.products[i]!);
  });
}

/* ───────── taxonomy ───────── */
const list_ = <T,>(d: StoreData, key: string) => (d as unknown as Record<string, T[]>)[key]!;

function crud<T extends { slug: string }>(key: "brands" | "categories" | "collections", schema: z.ZodType<T>, label: string, inUse: (d: StoreData, slug: string) => number, extra?: (d: StoreData, v: T) => string[]) {
  return {
    create: (actor: string, input: unknown): Promise<Result<T>> => mutate(actor, `${label}.create`, (d) => {
      const base = input as { slug?: string; name?: string };
      const parsed = schema.safeParse({ ...(input as object), slug: base.slug || slugify(base.name ?? "") });
      if (!parsed.success) return fail(422, ...issues(parsed.error));
      if (list_<T>(d, key).some((x) => x.slug === parsed.data.slug)) return fail(409, `${label} "${parsed.data.slug}" already exists`);
      const e = extra?.(d, parsed.data) ?? []; if (e.length) return fail(422, ...e);
      list_<T>(d, key).push(parsed.data);
      return ok(parsed.data);
    }),
    update: (actor: string, slug: string, patch: unknown): Promise<Result<T>> => mutate(actor, `${label}.update ${slug}`, (d) => {
      const list = list_<T>(d, key); const i = list.findIndex((x) => x.slug === slug);
      if (i < 0) return fail(404, `${label} "${slug}" not found`);
      const parsed = schema.safeParse({ ...list[i]!, ...(patch as object), slug });
      if (!parsed.success) return fail(422, ...issues(parsed.error));
      const e = extra?.(d, parsed.data) ?? []; if (e.length) return fail(422, ...e);
      list[i] = parsed.data;
      return ok(parsed.data);
    }),
    remove: (actor: string, slug: string): Promise<Result<{ slug: string }>> => mutate(actor, `${label}.delete ${slug}`, (d) => {
      const list = list_<T>(d, key);
      if (!list.some((x) => x.slug === slug)) return fail(404, `${label} "${slug}" not found`);
      const n = inUse(d, slug);
      if (n > 0) return fail(409, `${label} "${slug}" is used by ${n} item(s); reassign them first`);
      (d as unknown as Record<string, T[]>)[key] = list.filter((x) => x.slug !== slug);
      return ok({ slug });
    }),
  };
}

export const brands = crud<Brand>("brands", brand as z.ZodType<Brand>, "brand", (d, s) => d.products.filter((p) => p.brand === s).length);
export const categories = crud<Category>("categories", category as z.ZodType<Category>, "category", (d, s) => d.products.filter((p) => p.category === s).length + d.categories.filter((c) => c.parent === s).length,
  (d, c) => (c.parent && (c.parent === c.slug || !d.categories.some((x) => x.slug === c.parent)) ? [`parent: "${c.parent}" is not a valid parent`] : []));
/** Collections are tags on products; deleting one removes it from products instead of blocking. */
export const collections = {
  ...crud<Collection>("collections", collection as z.ZodType<Collection>, "collection", () => 0),
  remove: (actor: string, slug: string): Promise<Result<{ slug: string; removedFrom: number }>> => mutate(actor, `collection.delete ${slug}`, (d) => {
    if (!d.collections.some((c) => c.slug === slug)) return fail(404, `collection "${slug}" not found`);
    let n = 0;
    d.products.forEach((p) => { if (p.collections.includes(slug)) { p.collections = p.collections.filter((c) => c !== slug); n++; } });
    d.collections = d.collections.filter((c) => c.slug !== slug);
    return ok({ slug, removedFrom: n });
  }),
};

export function updateDepartment(actor: string, slug: string, patch: unknown): Promise<Result<DepartmentMeta>> {
  return mutate(actor, `department.update ${slug}`, (d) => {
    const i = d.departments.findIndex((x) => x.slug === slug);
    if (i < 0) return fail(404, `department "${slug}" not found (departments are the fixed rooms of the mall)`);
    const parsed = departmentMeta.safeParse({ ...d.departments[i]!, ...(patch as object), slug });
    if (!parsed.success) return fail(422, ...issues(parsed.error));
    d.departments[i] = parsed.data;
    return ok(parsed.data);
  });
}

/* ───────── showroom ───────── */
/** Replace the fixtures of one department. Everything is validated; pins that no longer fit are dropped. */
export function setDepartmentSlots(actor: string, department: string, records: unknown): Promise<Result<SlotRecord[]>> {
  return mutate(actor, `showroom.slots ${department}`, (d) => {
    const list = z.array(slotRecord).safeParse(records);
    if (!list.success) return fail(422, ...issues(list.error));
    if (list.data.some((r) => r.department !== department)) return fail(422, `every fixture must belong to "${department}"`);
    const otherIds = new Set(d.showroom.slots.filter((s) => s.department !== department).map((s) => s.id));
    const errs = validateSlots(list.data, otherIds);
    if (errs.length) return fail(422, ...errs);
    d.showroom.slots = [...d.showroom.slots.filter((s) => s.department !== department), ...list.data];
    for (const [pid, sid] of Object.entries(d.showroom.assignments)) {
      const slot = d.showroom.slots.find((s) => s.id === sid);
      if (!slot || !slot.visible) delete d.showroom.assignments[pid];
    }
    return ok(list.data);
  });
}

/** Pin a product to a specific fixture (or clear the pin with null). The fixture must be in the product's department, accept its kind and have room. */
export function setAssignment(actor: string, productId: string, slotId: string | null): Promise<Result<{ productId: string; slotId: string | null }>> {
  return mutate<{ productId: string; slotId: string | null }>(actor, `showroom.pin ${productId}->${slotId}`, (d) => {
    const p = d.products.find((x) => x.id === productId);
    if (!p) return fail(404, `product "${productId}" not found`);
    if (slotId === null) { delete d.showroom.assignments[productId]; return ok({ productId, slotId }); }
    const slot = d.showroom.slots.find((s) => s.id === slotId);
    if (!slot) return fail(404, `fixture "${slotId}" not found`);
    if (!slot.visible) return fail(422, "that fixture is hidden");
    if (!p.showInMall) return fail(422, "this product is hidden from the mall");
    if (slot.department !== p.department) return fail(422, `fixture is in ${slot.department}, the product is in ${p.department}`);
    const cls = productClass(kindForCategory(d.categories, p.category));
    if (slot.accepts !== "any" && slot.accepts !== cls) return fail(422, `this fixture takes ${slot.accepts} items, the product is ${cls}`);
    const taken = Object.entries(d.showroom.assignments).filter(([pid, sid]) => sid === slotId && pid !== productId).length;
    if (taken >= slot.capacity) return fail(409, `fixture is full (${slot.capacity})`);
    d.showroom.assignments[productId] = slotId;
    return ok({ productId, slotId });
  });
}

export { effectivePrice };
