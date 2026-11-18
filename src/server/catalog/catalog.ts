import "server-only";
import { applyDepartmentMeta } from "@/modules/showroom/layout";
import { effectivePrice, type Brand, type Category, type Collection, type DepartmentMeta, type Product } from "@/modules/catalog/types";
import type { SlotRecord } from "@/modules/showroom/slots";
import { readStore, type Rejected } from "@/server/store/db";

/**
 * Read model over the application database. The mall, shop, search, cart and favorites all read through here,
 * so there is exactly one product source and one id per product.
 */
export type Catalog = {
  brands: Brand[]; categories: Category[]; collections: Collection[]; departments: DepartmentMeta[];
  products: Product[]; slots: SlotRecord[]; pins: Record<string, string>; rejected: Rejected[];
};

export function getCatalog(): Catalog {
  const { data, rejected } = readStore();
  applyDepartmentMeta(data.departments);
  return { brands: data.brands, categories: data.categories, collections: data.collections, departments: data.departments, products: data.products, slots: data.showroom.slots, pins: data.showroom.assignments, rejected };
}

export const getProductBySlug = (slug: string) => getCatalog().products.find((p) => p.slug === slug);
export const getProductById = (id: string) => getCatalog().products.find((p) => p.id === id);
export { effectivePrice };
