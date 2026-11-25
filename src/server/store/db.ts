import "server-only";
import { z } from "zod";
import { brand, category, collection, departmentMeta, DEPARTMENTS, product, type Brand, type Category, type Collection, type DepartmentMeta, type Product } from "@/modules/catalog/types";
import { order, paymentEvent, resetToken, user, type Order, type PaymentEvent, type ResetToken, type User } from "@/modules/commerce/types";
import { defaultSlotRecords, slotRecord, type SlotRecord } from "@/modules/showroom/slots";
import demoSeed from "../../../data/seed/demo.json";
import { getDb, type Db, type Queryable } from "@/server/db/driver";
import { migrate } from "@/server/db/schema";

/**
 * The application database: PostgreSQL (Netlify Database in production). It is the ONLY source of products for the shop, search, cart and the 3D mall.
 * Reads are async and cached per server instance; the cache is validated against a version counter on every request, so a change made by
 * any other instance is seen immediately. Writes go through mutate(): one transaction under an advisory lock (so concurrent instances
 * serialise exactly like the old in-process mutex), which diffs the draft against what it loaded and writes only the changed rows.
 */
export type StoreData = {
  version: 2;
  brands: Brand[];
  categories: Category[];
  collections: Collection[];
  departments: DepartmentMeta[];
  products: Product[];
  showroom: { slots: SlotRecord[]; assignments: Record<string, string> };
  /** Customer accounts, orders and payment bookkeeping. Written only through src/server/commerce. */
  users: User[];
  orders: Order[];
  resetTokens: ResetToken[];
  paymentEvents: PaymentEvent[];
};
export type Rejected = { id: string; reasons: string[] };

const storeSchema = z.object({
  version: z.literal(2),
  brands: z.array(brand), categories: z.array(category), collections: z.array(collection), departments: z.array(departmentMeta),
  products: z.array(z.unknown()),
  showroom: z.object({ slots: z.array(z.unknown()), assignments: z.record(z.string(), z.string()) }),
  users: z.array(user).default([]), orders: z.array(order).default([]), resetTokens: z.array(resetToken).default([]), paymentEvents: z.array(paymentEvent).default([]),
});


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
  return { version: 2, brands: [], categories: DEFAULT_CATEGORIES, collections: [], departments: DEFAULT_DEPARTMENTS, products: [], showroom: { slots: defaultSlotRecords(), assignments: {} }, users: [], orders: [], resetTokens: [], paymentEvents: [] };
}


/** First run: the labelled demo seed on top of the default taxonomy and fixture layout. The seed is bundled with the code (no file is read at runtime). */
function seeded(): StoreData {
  const base = emptyStore();
  const seed = demoSeed as unknown as Partial<StoreData>;
  const cats = new Map(base.categories.map((c) => [c.slug, c]));
  (seed.categories ?? []).forEach((c) => cats.set(c.slug, c));
  return { ...base, brands: seed.brands ?? [], categories: [...cats.values()], collections: seed.collections ?? [], departments: seed.departments ?? base.departments, products: (seed.products ?? []) as Product[] };
}

export type Loaded = { data: StoreData; rejected: Rejected[] };
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


// ───────────────────────── table mapping ─────────────────────────
type Spec<T> = { table: string; key: (x: T) => string; keyCol: string; extra?: (x: T) => Record<string, unknown> };
const SPECS = {
  brands: { table: "brands", keyCol: "slug", key: (x: Brand) => x.slug },
  categories: { table: "categories", keyCol: "slug", key: (x: Category) => x.slug },
  collections: { table: "collections", keyCol: "slug", key: (x: Collection) => x.slug },
  departments: { table: "departments", keyCol: "slug", key: (x: DepartmentMeta) => x.slug },
  products: { table: "products", keyCol: "id", key: (x: Product) => x.id, extra: (x: Product) => ({ slug: x.slug, brand: x.brand, department: x.department, category: x.category, availability: x.availability, price_amount: x.price?.amount ?? null, currency: x.price?.currency ?? null }) },
  slots: { table: "showroom_slots", keyCol: "id", key: (x: SlotRecord) => x.id, extra: (x: SlotRecord) => ({ department: x.department }) },
  users: { table: "users", keyCol: "id", key: (x: User) => x.id, extra: (x: User) => ({ email: x.email.toLowerCase() }) },
  orders: { table: "orders", keyCol: "id", key: (x: Order) => x.id, extra: (x: Order) => ({ user_id: x.userId, idempotency_key: x.idempotencyKey, payment_status: x.payment.status, status: x.status, created_at: x.createdAt }) },
  resetTokens: { table: "reset_tokens", keyCol: "hash", key: (x: ResetToken) => x.hash, extra: (x: ResetToken) => ({ user_id: x.userId, expires_at: x.expiresAt }) },
  paymentEvents: { table: "payment_events", keyCol: "key", key: (x: PaymentEvent) => x.key, extra: (x: PaymentEvent) => ({ provider: x.provider, order_id: x.orderId }) },
} as const;

type Raw = { top: Record<string, unknown>; assignments: Record<string, string> };
async function loadRaw(q: Queryable, parallel: boolean): Promise<Raw> {
  const all = async (spec: { table: string }) => (await q.query<{ data: unknown }>(`select data from ${spec.table} order by pos`)).rows.map((r) => r.data);
  // a transaction owns ONE connection (queries on it are sequential); the pool can run the reads side by side
  const run = async <T,>(fns: (() => Promise<T>)[]): Promise<T[]> => { if (parallel) return Promise.all(fns.map((f) => f())); const out: T[] = []; for (const f of fns) out.push(await f()); return out; };
  const [brands, categories, collections, departments, products, slots, users, orders, resetTokens, paymentEvents, assign] = await run<unknown>([
    () => all(SPECS.brands), () => all(SPECS.categories), () => all(SPECS.collections), () => all(SPECS.departments), () => all(SPECS.products), () => all(SPECS.slots), () => all(SPECS.users), () => all(SPECS.orders), () => all(SPECS.resetTokens), () => all(SPECS.paymentEvents),
    () => q.query<{ product_id: string; slot_id: string }>("select product_id, slot_id from showroom_assignments"),
  ]) as [unknown[], unknown[], unknown[], unknown[], unknown[], unknown[], unknown[], unknown[], unknown[], unknown[], { rows: { product_id: string; slot_id: string }[] }];
  const assignments: Record<string, string> = {}; assign.rows.forEach((r) => (assignments[r.product_id] = r.slot_id));
  return { top: { version: 2, brands, categories, collections, departments, products, showroom: { slots, assignments }, users, orders, resetTokens, paymentEvents }, assignments };
}

/** Write only what changed between `before` and `after` (insert/update by key, delete what is gone, keep list order in `pos`). */
async function writeDiff(tx: Queryable, before: StoreData, after: StoreData): Promise<boolean> {
  let changed = false;
  async function sync<T>(spec: Spec<T>, a: readonly T[], b: readonly T[]) {
    const old = new Map(a.map((x, i) => [spec.key(x), { json: JSON.stringify(x), pos: i }]));
    const keep = new Set<string>();
    for (let i = 0; i < b.length; i++) {
      const x = b[i]!, k = spec.key(x), json = JSON.stringify(x); keep.add(k);
      const o = old.get(k); if (o && o.json === json && o.pos === i) continue;
      const extra = spec.extra?.(x) ?? {}, cols = ["pos", "data", ...Object.keys(extra)];
      const vals = [i, json, ...Object.values(extra)];
      await tx.query(`insert into ${spec.table} (${spec.keyCol}, ${cols.join(", ")}) values ($1, ${cols.map((_, j) => (j === 1 ? `$${j + 2}::jsonb` : `$${j + 2}`)).join(", ")}) on conflict (${spec.keyCol}) do update set ${cols.map((c) => `${c} = excluded.${c}`).join(", ")}`, [k, ...vals]);
      changed = true;
    }
    const gone = [...old.keys()].filter((k) => !keep.has(k));
    if (gone.length) { await tx.query(`delete from ${spec.table} where ${spec.keyCol} = any($1::text[])`, [gone]); changed = true; }
  }
  await sync(SPECS.brands, before.brands, after.brands); await sync(SPECS.categories, before.categories, after.categories);
  await sync(SPECS.collections, before.collections, after.collections); await sync(SPECS.departments, before.departments, after.departments);
  await sync(SPECS.products, before.products, after.products); await sync(SPECS.slots, before.showroom.slots, after.showroom.slots);
  await sync(SPECS.users, before.users, after.users); await sync(SPECS.orders, before.orders, after.orders);
  await sync(SPECS.resetTokens, before.resetTokens, after.resetTokens); await sync(SPECS.paymentEvents, before.paymentEvents, after.paymentEvents);
  // fixture assignments: product -> slot
  const a = before.showroom.assignments, b = after.showroom.assignments;
  for (const [pid, sid] of Object.entries(b)) if (a[pid] !== sid) { await tx.query("insert into showroom_assignments (product_id, slot_id) values ($1, $2) on conflict (product_id) do update set slot_id = excluded.slot_id", [pid, sid]); changed = true; }
  const dropped = Object.keys(a).filter((pid) => !(pid in b)); if (dropped.length) { await tx.query("delete from showroom_assignments where product_id = any($1::text[])", [dropped]); changed = true; }
  return changed;
}

// ───────────────────────── readiness: schema + first-run seed ─────────────────────────
const LOCK_SEED = 7_000_002;
type G = { __vestoraReady?: Promise<void>; __vestoraStore?: { version: string; loaded: Loaded } | null };
const g = globalThis as unknown as G;

async function prepare(db: Db) {
  await migrate(db);
  await db.transaction(async (tx) => {
    await tx.query("select pg_advisory_xact_lock($1)", [LOCK_SEED]);
    const done = (await tx.query("select 1 from meta where key = 'seeded'")).rows.length > 0;
    if (done) return;
    // first run on an empty database: load the demo data (never over existing data)
    const n = (await tx.query<{ n: string }>("select (select count(*) from products) + (select count(*) from brands) as n")).rows[0]!.n;
    if (Number(n) === 0) await writeDiff(tx, parse(emptyShape()).data, parse(JSON.parse(JSON.stringify(seeded()))).data);
    await tx.query("insert into meta (key, value) values ('seeded', 'true'::jsonb), ('store_version', '1'::jsonb) on conflict (key) do nothing");
  });
}
const emptyShape = () => ({ ...emptyStore(), categories: [], departments: [], showroom: { slots: [], assignments: {} } });

/** The connected, migrated and seeded database. Retried on the next call if it failed. */
export async function ready(): Promise<Db> {
  const db = await getDb();
  if (!g.__vestoraReady) { const p = prepare(db); g.__vestoraReady = p; p.catch(() => { if (g.__vestoraReady === p) g.__vestoraReady = undefined; }); }
  await g.__vestoraReady;
  return db;
}

export async function readStore(): Promise<Loaded> {
  const db = await ready();
  const v = String((await db.query<{ value: unknown }>("select value from meta where key = 'store_version'")).rows[0]?.value ?? "0");
  const c = g.__vestoraStore; if (c && c.version === v) return c.loaded;
  const { top } = await loadRaw(db, true);
  const loaded = parse(top);
  if (loaded.rejected.length) console.warn(`[store] ${loaded.rejected.length} record(s) rejected on load`, loaded.rejected.slice(0, 3));
  g.__vestoraStore = { version: v, loaded };
  return loaded;
}

export type Fail = { ok: false; status: number; errors: string[] };
export type Ok<T> = { ok: true; data: T };
export type Result<T> = Ok<T> | Fail;
export const ok = <T,>(data: T): Ok<T> => ({ ok: true, data });
export const fail = (status: number, ...errors: string[]): Fail => ({ ok: false, status, errors });

/**
 * Run a change against a private copy of the store inside one transaction. Only a successful result is written. Changes are serialised
 * across ALL server instances by a transaction-scoped advisory lock, so checks like "enough stock" and "was this webhook seen" are race-free.
 */
export async function mutate<T>(actor: string, action: string, fn: (draft: StoreData) => Result<T>): Promise<Result<T>> {
  const db = await ready();
  const result = await db.transaction(async (tx) => {
    await tx.query("select pg_advisory_xact_lock($1)", [7_000_003]);
    const base = parse((await loadRaw(tx, false)).top).data;
    const draft = structuredClone(base);
    const r = fn(draft);
    if (!r.ok) return r;
    if (await writeDiff(tx, base, draft)) await tx.query("update meta set value = to_jsonb((value #>> '{}')::bigint + 1) where key = 'store_version'");
    await tx.query("insert into audit_log (actor, action) values ($1, $2)", [actor.slice(0, 120), action.slice(0, 200)]);
    return r;
  });
  g.__vestoraStore = null;
  return result;
}

/** Most recent admin/audit entries, newest first. */
export async function recentAudit(n = 8): Promise<{ at: string; actor: string; action: string }[]> {
  const db = await ready();
  return (await db.query<{ at: Date; actor: string; action: string }>("select at, actor, action from audit_log order by id desc limit $1", [n])).rows.map((r) => ({ at: new Date(r.at).toISOString(), actor: r.actor, action: r.action }));
}

/** Test/maintenance helper: forget the cache. */
export const resetCache = () => { g.__vestoraStore = null; };
