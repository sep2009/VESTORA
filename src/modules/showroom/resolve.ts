import { DISPLAYS } from "./displays";
import { getSample } from "./sample-products";
import type { ResolvedDisplay, ShowroomCatalogProduct } from "./types";

/**
 * Turns placements into renderable displays. Real catalog products take over the
 * first displays of their department (in catalog order); remaining displays keep
 * their clearly labelled sample product.
 */
export function resolveDisplays(catalog: readonly ShowroomCatalogProduct[] = []): ResolvedDisplay[] {
  const byDept = new Map<string, ShowroomCatalogProduct[]>();
  for (const p of catalog) byDept.set(p.departmentSlug, [...(byDept.get(p.departmentSlug) ?? []), p]);
  const used = new Map<string, number>();

  return DISPLAYS.map((placement) => {
    const queue = byDept.get(placement.departmentId) ?? [];
    const i = used.get(placement.departmentId) ?? 0;
    const real = queue[i];
    if (real) {
      used.set(placement.departmentId, i + 1);
      return {
        placement: { ...placement, productRef: { kind: "catalog", productId: real.id } },
        kind: placement.itemKind,
        color: real.colorHex ?? placement.itemColor,
        product: { name: real.name, isSample: false, slug: real.slug, modelUrl: real.modelUrl, imageUrl: real.imageUrl },
      };
    }
    const ref = placement.productRef;
    const sample = ref.kind === "sample" ? getSample(ref.sampleId) : undefined;
    return {
      placement, kind: placement.itemKind, color: placement.itemColor,
      product: { name: sample?.name ?? "Sample product", isSample: true, slug: null, modelUrl: null, imageUrl: null },
    };
  });
}
