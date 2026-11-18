import "server-only";
import { randomBytes } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { brand, category, collection, departmentMeta, DEPARTMENTS, product, type Brand, type Category, type Collection, type DepartmentMeta, type Product } from "@/modules/catalog/types";
import { defaultSlotRecords, slotRecord, type SlotRecord } from "@/modules/showroom/slots";

/**
 * The application database. Development store: one JSON file, written atomically and serialised through a mutex.
 * It is the ONLY source of products for the shop, search, cart and the 3D mall. The production schema for Supabase
 * (with row-level security) is in supabase/migrations; the repository API in repo.ts is what would be re-implemented there.
 */
export type StoreData = {
  version: 2;
  brands: Brand[];
  categories: Category[];
  collections: Collection[];
  departments: DepartmentMeta[];
  products: Product[];
  showroom: { slots: SlotRecord[]; assignments: Record<string, string> };
};
export type Rejected = { id: string; reasons: string[] };

const storeSchema = z.object({
  version: z.literal(2),
  brands: z.array(brand), categories: z.array(category), collections: z.array(collection), departments: z.array(departmentMeta),
  products: z.array(z.unknown()),
  showroom: z.object({ slots: z.array(z.unknown()), assignments: z.record(z.string(), z.string()) }),
});

export const dataDir = () => process.env.VESTORA_DATA_DIR ?? path.join(process.cwd(), "data", "db");
export const seedPath = () => process.env.VESTORA_SEED_FILE ?? path.join(process.cwd(), "data", "seed", "demo.json");
const storePath = () => path.join(dataDir(), "store.json");

const DEFAULT_CATEGORIES: Category[] = [
  { slug: "tops", name: "Tops", kind: "tee", parent: null }, { slug: "shirts", name: "Shirts", kind: "shirt", parent: "tops" },
  { slug: "t-shirts", name: "T-shirts", kind: "tee", parent: "tops" }, { slug: "hoodies", name: "Hoodies", kind: "hoodie", parent: "tops" },
  { slug: "pants", name: "Pants", kind: "trousers", parent: null }, { slug: "jeans", name: "Jeans", kind: "trousers", parent: "pants" },
  { slug: "jackets", name: "Jackets", kind: "jacket", parent: null }, { slug: "coats", name: "Coats", kind: "coat", parent: null },
  { slug: "dresses", name: "Dresses", kind: "dress", parent: null }, { slug: "suits", name: "Suits", kind: "suit", parent: null },
  { slug: "shoes", name: "Shoes", kind: "sneaker", parent: null }, { slug: "bags", name: "Bags", kind: "bag", parent: null },
  { slug: "accessories", name: "Accessories", kind: "bag", parent: null },
];

const DEFAULT_DEPARTMENTS: DepartmentMeta[] = DEPARTMENTS.map((slug) => ({
  slug, name: slug.split("-").map((w) => w[0]!.toUpperCase() + w.slice(1)).join(" "), tagline: "", showInMall: true,
}));

export function emptyStore(): StoreData {
  return { version: 2, brands: [], categories: DEFAULT_CATEGORIES, collections: [], departments: DEFAULT_DEPARTMENTS, products: [], showroom: { slots: defaultSlotRecords(), assignments: {} } };
}

/** First run: build the store from the labelled demo seed (if present) on top of the default taxonomy and fixture layout. */
function seeded(): StoreData {
  const base = emptyStore();
  if (!existsSync(seedPath())) return base;
  const seed = JSON.parse(readFileSync(seedPath(), "utf8")) as Partial<StoreData>;
  const cats = new Map(base.categories.map((c) => [c.slug, c]));
  (seed.categories ?? []).forEach((c) => cats.set(c.slug, c));
  return {
    ...base,
    brands: seed.brands ?? [], categories: [...cats.values()], collections: seed.collections ?? [],
    departments: seed.departments ?? base.departments, products: (seed.products ?? []) as Product[],
  };
}

export type Loaded = { data: StoreData; rejected: Rejected[] };
let cache: { mtime: number; loaded: Loaded } | null = null;

function parse(raw: unknown): Loaded {
  const top = storeSchema.parse(raw);
  const rejected: Rejected[] = [];
  const products: Product[] = [];
  for (const p of top.products) {
    const r = product.safeParse(p);
    if (r.success) products.push(r.data);
    else rejected.push({ id: String((p as { id?: unknown })?.id ?? "?"), reasons: r.error.issues.map((i) => `${i.path.join(".") || "record"}: ${i.message}`) });
  }
  const slots: SlotRecord[] = [];
  for (const s of top.showroom.slots) { const r = slotRecord.safeParse(s); if (r.success) slots.push(r.data); else rejected.push({ id: `slot:${String((s as { id?: unknown })?.id ?? "?")}`, reasons: r.error.issues.map((i) => i.message) }); }
  return { data: { ...top, products, showroom: { slots, assignments: top.showroom.assignments } }, rejected };
}

function writeAtomic(data: StoreData) {
  mkdirSync(dataDir(), { recursive: true });
  const tmp = `${storePath()}.${randomBytes(4).toString("hex")}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2));
  renameSync(tmp, storePath());
}

export function readStore(): Loaded {
  if (!existsSync(storePath())) { writeAtomic(seeded()); cache = null; }
  const mtime = statSync(storePath()).mtimeMs;
  if (cache && cache.mtime === mtime) return cache.loaded;
  const loaded = parse(JSON.parse(readFileSync(storePath(), "utf8")));
  if (loaded.rejected.length) console.warn(`[store] ${loaded.rejected.length} record(s) rejected on load`, loaded.rejected.slice(0, 3));
  cache = { mtime, loaded };
  return loaded;
}

export type Fail = { ok: false; status: number; errors: string[] };
export type Ok<T> = { ok: true; data: T };
export type Result<T> = Ok<T> | Fail;
export const ok = <T,>(data: T): Ok<T> => ({ ok: true, data });
export const fail = (status: number, ...errors: string[]): Fail => ({ ok: false, status, errors });

let queue: Promise<unknown> = Promise.resolve();

/** Run a change against a private copy of the store. Only a successful result is written (atomically); changes are serialised. */
export function mutate<T>(actor: string, action: string, fn: (draft: StoreData) => Result<T>): Promise<Result<T>> {
  const run = async (): Promise<Result<T>> => {
    const draft = structuredClone(readStore().data);
    const result = fn(draft);
    if (!result.ok) return result;
    writeAtomic(draft);
    cache = null;
    try { appendFileSync(path.join(dataDir(), "audit.log"), JSON.stringify({ at: new Date().toISOString(), actor, action }) + "\n"); } catch { /* audit is best effort */ }
    return result;
  };
  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next;
}

/** Test/maintenance helper: forget the cache. */
export const resetCache = () => { cache = null; };
