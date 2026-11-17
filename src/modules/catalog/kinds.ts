import type { Category } from "./types";
import type { ItemKind } from "@/modules/showroom/types";

/** How a category is drawn in the 3D mall. The product record stays the single source of truth. */
export const CATEGORY_KIND: Record<Category, ItemKind> = {
  "t-shirts": "tee", shirts: "shirt", hoodies: "hoodie", jackets: "jacket", coats: "coat", dresses: "dress",
  trousers: "trousers", jeans: "trousers", suits: "suit", sneakers: "sneaker", bags: "bag", watches: "watch", eyewear: "glasses",
};

export const CATEGORY_LABEL: Record<Category, string> = {
  "t-shirts": "T-shirts", shirts: "Shirts", hoodies: "Hoodies", jackets: "Jackets", coats: "Coats", dresses: "Dresses",
  trousers: "Trousers", jeans: "Jeans", suits: "Suits", sneakers: "Sneakers", bags: "Bags", watches: "Watches", eyewear: "Eyewear",
};

export const DEPARTMENT_LABEL: Record<string, string> = {
  sportswear: "Sportswear", sneakers: "Sneakers", streetwear: "Streetwear", luxury: "Luxury", casual: "Casual",
  formal: "Formal", denim: "Denim", accessories: "Accessories", "new-arrivals": "New Arrivals",
};
