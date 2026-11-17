export type Vec3 = readonly [number, number, number];

export type ZoneSlug = "sportswear" | "sneakers" | "streetwear" | "luxury" | "casual" | "formal" | "denim" | "accessories" | "new-arrivals";
export type ZoneId = ZoneSlug | "entrance";

export type FloorKind = "marble" | "limestone" | "travertine" | "concrete" | "terrazzo" | "oak" | "parquet" | "plaster";

export type ZonePalette = {
  floor: string; floorLine: string; floorKind: FloorKind;
  wall: string; trim: string; accent: string; accent2: string;
  light: string; lightIntensity: number;
};

export type ZoneDef = {
  id: ZoneId;
  /** Department slug (matches the database department slug) or null for non-department areas. */
  department: ZoneSlug | null;
  name: string;
  tagline: string;
  col: -1 | 0 | 1;
  row: -1 | 0 | 1 | 2;
  center: readonly [number, number];
  palette: ZonePalette;
};

export type ItemKind =
  | "tee" | "shirt" | "hoodie" | "jacket" | "coat" | "dress" | "suit" | "trousers"
  | "sneaker" | "bag" | "watch" | "glasses";

export type DisplayType = "rack" | "mannequin" | "platform" | "shelf" | "pedestal" | "table" | "niche";

/** What a product class a slot can hold. */
export type SlotAccepts = "garment" | "footwear" | "accessory" | "any";

/**
 * A fixed fixture in a department (rack, mannequin, plinth, shelf…). Slots are LAYOUT ONLY: they own no product data.
 * Products come from the central catalog and are assigned to slots by `assignProducts`.
 */
export type DisplaySlot = {
  id: string;
  departmentId: ZoneId;
  position: Vec3;
  /** Euler rotation in radians. Only Y is used by the current displays. */
  rotation: Vec3;
  scale: number;
  type: DisplayType;
  accepts: SlotAccepts;
  /** How many different products this fixture can hold (a rack holds several; a mannequin holds one). */
  capacity: number;
  spin?: boolean;
  glass?: boolean;
};

/** A catalog product as the mall needs it. `id` is the catalog product id: the same id the shop, cart and favorites use. */
export type MallProduct = {
  id: string;
  slug: string;
  name: string;
  brandName: string;
  kind: ItemKind;
  color: string;
  demo: boolean;
  modelUrl: string | null;
  department: string;
  /** Price in minor units, or null when the record has none. */
  price: { amount: number; currency: string } | null;
  availability: "in_stock" | "out_of_stock" | "unknown";
  image: string | null;
};

export type ResolvedDisplay = { slot: DisplaySlot; products: MallProduct[] };
