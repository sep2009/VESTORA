import "server-only";
import { department, product, type Department, type Product } from "@/domain";
import { z } from "zod";
import { getPublicSupabase } from "../supabase/server";

/** Explicit result so the UI can tell "no data yet" from "backend not set up" from "failed". */
export type CatalogResult<T> =
  | { status: "ok"; data: T }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

export async function listDepartments(): Promise<CatalogResult<Department[]>> {
  const db = getPublicSupabase();
  if (!db) return { status: "unconfigured" };
  const { data, error } = await db
    .from("departments")
    .select("id, slug, name, description, themeKey:theme_key, sortOrder:sort_order")
    .order("sort_order");
  if (error) return { status: "error", message: error.message };
  const parsed = z.array(department).safeParse(data);
  return parsed.success
    ? { status: "ok", data: parsed.data }
    : { status: "error", message: "Department rows failed validation" };
}

const PRODUCT_SELECT = `
  id, slug, name, description, published,
  departmentId:department_id, categoryId:category_id,
  collectionIds:product_collections(collection_id),
  assets:product_assets(images, modelUrl:model_url),
  variants:product_variants(
    id, productId:product_id, sku,
    size:sizes(code, label), color:colors(code, label, hex),
    price:price_amount, currency,
    inventory:inventory(variantId:variant_id, quantityAvailable:quantity_available)
  )`;

/** Raw DB row -> domain Product. Throws via zod if the row is malformed. */
function toProduct(row: any): Product {
  return product.parse({
    ...row,
    collectionIds: (row.collectionIds ?? []).map((c: { collection_id: string }) => c.collection_id),
    assets: Array.isArray(row.assets) ? (row.assets[0] ?? { images: [], modelUrl: null }) : row.assets,
    variants: (row.variants ?? []).map((v: any) => ({
      ...v,
      price: { amount: v.price, currency: v.currency },
      inventory: Array.isArray(v.inventory) ? v.inventory[0] : v.inventory,
    })),
  });
}

export async function listProducts(): Promise<CatalogResult<Product[]>> {
  const db = getPublicSupabase();
  if (!db) return { status: "unconfigured" };
  const { data, error } = await db.from("products").select(PRODUCT_SELECT).eq("published", true);
  if (error) return { status: "error", message: error.message };
  try {
    return { status: "ok", data: (data ?? []).map(toProduct) };
  } catch {
    return { status: "error", message: "Product rows failed validation" };
  }
}

export async function getProductBySlug(slug: string): Promise<CatalogResult<Product | null>> {
  const db = getPublicSupabase();
  if (!db) return { status: "unconfigured" };
  const { data, error } = await db
    .from("products").select(PRODUCT_SELECT).eq("slug", slug).eq("published", true).maybeSingle();
  if (error) return { status: "error", message: error.message };
  if (!data) return { status: "ok", data: null };
  try {
    return { status: "ok", data: toProduct(data) };
  } catch {
    return { status: "error", message: "Product row failed validation" };
  }
}
