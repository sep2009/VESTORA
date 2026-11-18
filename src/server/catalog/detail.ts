import "server-only";
import { recommend, type Recommendations } from "@/modules/catalog/recommend";
import { departmentLabel } from "@/modules/catalog/kinds";
import type { Product } from "@/modules/catalog/types";
import { getCatalog } from "./catalog";
import { getIndex, type IndexItem } from "./index-data";

export type ProductDetail = {
  product: Product; brandName: string; categoryName: string; departmentName: string;
  collectionNames: Record<string, string>; inMall: boolean;
  recommendations: Recommendations<IndexItem>;
};

/** Everything the detail view needs, read from the one database: the product and recommendations that are real catalog records. */
export function getProductDetail(slug: string): ProductDetail | null {
  const c = getCatalog();
  const product = c.products.find((p) => p.slug === slug);
  if (!product) return null;
  const { items } = getIndex();
  const me = items.find((i) => i.id === product.id)!;
  return {
    product,
    brandName: c.brands.find((b) => b.slug === product.brand)?.name ?? product.brand,
    categoryName: c.categories.find((x) => x.slug === product.category)?.name ?? product.category,
    departmentName: departmentLabel(product.department),
    collectionNames: Object.fromEntries(c.collections.map((x) => [x.slug, x.name])),
    inMall: me.inMall,
    recommendations: recommend(me, items),
  };
}
