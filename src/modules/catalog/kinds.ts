import type { Category } from "./types";
import { ZONES } from "@/modules/showroom/layout";
import type { ItemKind } from "@/modules/showroom/types";

/** Category → 3D shape comes from the category record itself (admins choose it), with a safe fallback. */
export function kindForCategory(categories: readonly Pick<Category, "slug" | "kind">[], slug: string): ItemKind {
  return (categories.find((c) => c.slug === slug)?.kind ?? "tee") as ItemKind;
}

/** Department display name (editable in the admin; the mall rooms themselves are fixed). */
export const departmentLabel = (slug: string) => ZONES.find((z) => z.department === slug)?.name ?? slug;
