export type Vec3 = readonly [number, number, number];

export type ZoneSlug = "luxury" | "streetwear" | "minimal" | "casual" | "formal" | "accessories" | "new-arrivals";
export type ZoneId = ZoneSlug | "entrance" | "lounge";

export type FloorKind = "tiles" | "planks" | "parquet" | "concrete" | "plain" | "rings";

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
  row: -1 | 0 | 1;
  center: readonly [number, number];
  palette: ZonePalette;
};

export type ItemKind =
  | "tee" | "shirt" | "hoodie" | "jacket" | "coat" | "dress" | "suit" | "trousers"
  | "sneaker" | "bag" | "watch" | "glasses";

export type DisplayType = "rack" | "mannequin" | "platform" | "shelf" | "pedestal" | "table" | "niche";

/** Either a real catalog product or a clearly identified development sample. */
export type ProductRef =
  | { kind: "catalog"; productId: string }
  | { kind: "sample"; sampleId: string };

export type DisplayPlacement = {
  id: string;
  departmentId: ZoneId;
  position: Vec3;
  /** Euler rotation in radians. Only Y is used by the current displays. */
  rotation: Vec3;
  scale: number;
  type: DisplayType;
  productRef: ProductRef;
  /** Appearance used by the procedural placeholder (and as a fallback for catalog products). */
  itemKind: ItemKind;
  itemColor: string;
  /** Slowly turns the display (new-arrival turntables). */
  spin?: boolean;
  /** Draws a glass case around the display. */
  glass?: boolean;
};

export type SampleProduct = {
  id: string;
  name: string;
  department: ZoneSlug;
  kind: ItemKind;
  color: string;
};

/** What the scene and info card need to know about whatever product a display shows. */
export type ShownProduct = {
  name: string;
  isSample: boolean;
  slug: string | null;
  modelUrl: string | null;
  imageUrl: string | null;
};

export type ResolvedDisplay = {
  placement: DisplayPlacement;
  product: ShownProduct;
  kind: ItemKind;
  color: string;
};

/** Minimal serializable catalog data handed from the server page to the scene. */
export type ShowroomCatalogProduct = {
  id: string;
  slug: string;
  name: string;
  departmentSlug: string;
  modelUrl: string | null;
  imageUrl: string | null;
  colorHex: string | null;
};
