// Style quiz, style profile and recommendation engine. Pure rules over catalog records: no network, no AI provider.
// Runs in the browser, on the server and in node tests. Imports only the (also pure) outfit core.
import { OCCASIONS, OCCASION_LABEL, colorsInStock, completeLook, hexFor, hexToHsl, isNeutralHex, place, rateWorn, type Occasion, type Picks, type Slot, type StudioItem } from "../outfit/core.ts";

// ======================= vocabulary =======================
export const STYLES = ["minimalist", "classic", "streetwear", "sporty", "casual", "elegant"] as const;
export type StyleId = (typeof STYLES)[number];
export const STYLE_INFO: Record<StyleId, { label: string; blurb: string }> = {
  minimalist: { label: "Minimalist", blurb: "Clean, simple, calm colors" },
  classic: { label: "Classic", blurb: "Timeless pieces that last" },
  streetwear: { label: "Streetwear", blurb: "Relaxed, urban, bold" },
  sporty: { label: "Sporty", blurb: "Active and comfortable" },
  casual: { label: "Casual", blurb: "Easy everyday outfits" },
  elegant: { label: "Elegant", blurb: "Refined and dressy" },
};
export const SEASONS = ["spring", "summer", "autumn", "winter"] as const;
export type Season = (typeof SEASONS)[number];
export const COMBOS = ["tee-jeans-sneakers", "shirt-trousers", "hoodie-sneakers", "suit", "dress-jacket", "layered"] as const;
export type ComboId = (typeof COMBOS)[number];
export const COMBO_INFO: Record<ComboId, { label: string; kinds: string[]; styles: StyleId[] }> = {
  "tee-jeans-sneakers": { label: "A tee, jeans and sneakers", kinds: ["tee", "trousers", "sneaker"], styles: ["casual"] },
  "shirt-trousers": { label: "A shirt with tailored trousers", kinds: ["shirt", "trousers"], styles: ["classic", "minimalist"] },
  "hoodie-sneakers": { label: "A hoodie, pants and sneakers", kinds: ["hoodie", "trousers", "sneaker"], styles: ["streetwear", "sporty"] },
  suit: { label: "A suit with a shirt", kinds: ["suit", "shirt"], styles: ["classic", "elegant"] },
  "dress-jacket": { label: "A dress with a jacket", kinds: ["dress", "jacket", "coat"], styles: ["elegant", "classic"] },
  layered: { label: "A tee or shirt under a jacket or coat", kinds: ["tee", "shirt", "jacket", "coat"], styles: ["casual", "minimalist"] },
};
/** Singular nouns for explanations. */
export const KIND_NOUN: Record<string, string> = { tee: "tee", shirt: "shirt", hoodie: "hoodie", jacket: "jacket", coat: "coat", suit: "suit", trousers: "pair of pants", dress: "dress", sneaker: "pair of sneakers", bag: "bag", watch: "watch", glasses: "pair of glasses" };
export const KIND_LABEL: Record<string, string> = { tee: "T-shirts", shirt: "Shirts", hoodie: "Hoodies", jacket: "Jackets", coat: "Coats", suit: "Suits", trousers: "Pants and jeans", dress: "Dresses", sneaker: "Shoes", bag: "Bags", watch: "Watches", glasses: "Eyewear" };
const KIND_TAGS: Record<string, string[]> = { tee: ["t-shirts"], shirt: ["shirts"], hoodie: ["hoodies"], jacket: ["jackets"], coat: ["coats"], suit: ["suits"], trousers: ["pants", "jeans"], dress: ["dresses"], sneaker: ["shoes", "sneakers"], bag: ["bags"], watch: ["watches"], glasses: ["eyewear"] };

/** A catalog product as the engine sees it. Built from the product database only. */
export type StyleItem = StudioItem & { tags: string[]; brand: string; isNew: boolean };
/** What the quiz offers, taken from the real catalog so every option leads to products. */
export type Facts = {
  departments: { slug: string; name: string }[]; kinds: string[]; colors: { name: string; hex: string }[]; brands: { slug: string; name: string }[];
  currency: string; priceMin: number; priceMax: number;
};

// ======================= quiz =======================
export type QuestionId = "departments" | "kinds" | "styles" | "combos" | "formality" | "occasions" | "colors" | "seasons" | "budget" | "brands" | "audience";
export type Question = { id: QuestionId; title: string; hint: string; required: boolean; max?: number };
export const QUESTIONS: Question[] = [
  { id: "departments", title: "Which areas of the store interest you?", hint: "Pick the departments you like to browse.", required: true },
  { id: "kinds", title: "Which kinds of pieces do you like most?", hint: "Jackets, sneakers, dresses… choose any.", required: false },
  { id: "styles", title: "Which styles feel like you?", hint: "Choose up to three.", required: true, max: 3 },
  { id: "combos", title: "How do you like to put outfits together?", hint: "Choose any combinations you would wear.", required: false },
  { id: "formality", title: "Casual or formal?", hint: "Slide to where you usually land.", required: false },
  { id: "occasions", title: "What do you shop for?", hint: "Choose the occasions that matter to you.", required: false },
  { id: "colors", title: "Which colors do you like?", hint: "Pick favorites, and optionally colors to avoid.", required: false },
  { id: "seasons", title: "Which seasons are you shopping for?", hint: "Choose any.", required: false },
  { id: "budget", title: "What is your budget per item?", hint: "A rough range is enough. You can change it any time.", required: false },
  { id: "brands", title: "Any brands you like?", hint: "Optional. Brands from our catalog.", required: false },
  { id: "audience", title: "Which sections should we show you?", hint: "Optional. Your choice only: we never guess this.", required: false },
];

export type Budget = { min: number | null; max: number | null };
export type Answers = {
  departments: string[]; kinds: string[]; styles: StyleId[]; combos: ComboId[]; formality: number | null; occasions: Occasion[];
  colors: string[]; avoidColors: string[]; seasons: Season[]; budget: Budget | null; brands: string[]; audience: "all" | "men" | "women";
  /** Steps the shopper chose to skip. */
  skipped: QuestionId[];
};
export const emptyAnswers = (): Answers => ({ departments: [], kinds: [], styles: [], combos: [], formality: null, occasions: [], colors: [], avoidColors: [], seasons: [], budget: null, brands: [], audience: "all", skipped: [] });

export function answered(a: Answers, id: QuestionId): boolean {
  switch (id) {
    case "departments": return a.departments.length > 0;
    case "kinds": return a.kinds.length > 0;
    case "styles": return a.styles.length > 0;
    case "combos": return a.combos.length > 0;
    case "formality": return a.formality !== null;
    case "occasions": return a.occasions.length > 0;
    case "colors": return a.colors.length > 0 || a.avoidColors.length > 0;
    case "seasons": return a.seasons.length > 0;
    case "budget": return !!a.budget && (a.budget.min !== null || a.budget.max !== null);
    case "brands": return a.brands.length > 0;
    case "audience": return a.audience !== "all";
  }
}
/** The quiz can be finished when every required question has an answer. Optional ones may be skipped. */
export const missingRequired = (a: Answers): QuestionId[] => QUESTIONS.filter((q) => q.required && !answered(a, q.id)).map((q) => q.id);

// ======================= profile =======================
export type Derived = {
  departments: Record<string, number>; kinds: Record<string, number>; styles: Record<string, number>;
  colors: string[]; avoidColors: string[]; formality: number | null; occasions: Occasion[]; seasons: Season[];
  budget: { min: number | null; max: number | null; currency: string } | null; brands: string[]; audience: "all" | "men" | "women";
  /** Human-readable summary tags, e.g. "minimalist", "leans formal", "neutral palette". */
  tags: string[]; interestTags: string[];
};
export type StyleProfile = { v: 1; createdAt: number; updatedAt: number; answers: Answers; derived: Derived };

const isNeutralColor = (name: string, facts?: Facts) => { const c = facts?.colors.find((x) => x.name === name); return c ? isNeutralHex(c.hex) : /black|white|ivory|grey|gray|charcoal|stone|cream/i.test(name); };

export function deriveProfile(a: Answers, facts: Facts, now = Date.now(), createdAt = now): StyleProfile {
  const departments: Record<string, number> = {}; a.departments.forEach((d) => (departments[d] = 1));
  const kinds: Record<string, number> = {}; a.kinds.forEach((k) => (kinds[k] = 1));
  // an outfit combination you like implies its pieces (a little weaker than choosing them directly)
  a.combos.forEach((c) => COMBO_INFO[c].kinds.forEach((k) => { kinds[k] = Math.max(kinds[k] ?? 0, 0.6); }));
  const styles: Record<string, number> = {}; a.styles.forEach((s) => (styles[s] = 1));
  a.combos.forEach((c) => COMBO_INFO[c].styles.forEach((s) => { styles[s] = Math.max(styles[s] ?? 0, 0.5); }));
  const formality = a.formality === null ? null : (a.formality - 1) / 4;
  const tags: string[] = [...a.styles];
  if (formality !== null) tags.push(formality <= 0.3 ? "leans casual" : formality >= 0.7 ? "leans formal" : "casual-formal balance");
  if (a.colors.length >= 2) { const n = a.colors.filter((c) => isNeutralColor(c, facts)).length; tags.push(n === a.colors.length ? "neutral palette" : n === 0 ? "colorful palette" : "mixed palette"); }
  tags.push(...a.occasions.map((o) => OCCASION_LABEL[o].toLowerCase()));
  const interestTags = [...a.departments, ...a.styles, ...Object.keys(kinds).flatMap((k) => KIND_TAGS[k] ?? [])].map((t) => t.toLowerCase());
  const b = a.budget && (a.budget.min !== null || a.budget.max !== null) ? { min: a.budget.min, max: a.budget.max, currency: facts.currency } : null;
  return { v: 1, createdAt, updatedAt: now, answers: a, derived: { departments, kinds, styles, colors: a.colors, avoidColors: a.avoidColors, formality, occasions: a.occasions, seasons: a.seasons, budget: b, brands: a.brands, audience: a.audience, tags: [...new Set(tags)], interestTags: [...new Set(interestTags)] } };
}

const strs = (v: unknown, allowed: ReadonlySet<string> | null, max: number): string[] | null => {
  if (v === undefined) return [];
  if (!Array.isArray(v) || v.length > max) return null;
  const out: string[] = [];
  for (const x of v) { if (typeof x !== "string" || x.length > 80) return null; if (allowed && !allowed.has(x)) continue; if (!out.includes(x)) out.push(x); }
  return out;
};
/** Validate quiz answers from anywhere (storage, network). Unknown catalog values are dropped; malformed input is refused (null). */
export function sanitizeAnswers(raw: unknown, facts: Facts): Answers | null {
  const o = raw as Record<string, unknown> | null;
  if (!o || typeof o !== "object") return null;
  const set = (xs: readonly string[]) => new Set(xs);
  const departments = strs(o.departments, set(facts.departments.map((d) => d.slug)), 20), kinds = strs(o.kinds, set(facts.kinds), 20), styles = strs(o.styles, set(STYLES), 6);
  const combos = strs(o.combos, set(COMBOS), 6), occasions = strs(o.occasions, set(OCCASIONS), 6), colors = strs(o.colors, set(facts.colors.map((c) => c.name)), 40);
  const avoid = strs(o.avoidColors, set(facts.colors.map((c) => c.name)), 40), seasons = strs(o.seasons, set(SEASONS), 4), brands = strs(o.brands, set(facts.brands.map((b) => b.slug)), 40);
  if (!departments || !kinds || !styles || !combos || !occasions || !colors || !avoid || !seasons || !brands) return null;
  let formality: number | null = null;
  if (o.formality !== null && o.formality !== undefined) { if (typeof o.formality !== "number" || !Number.isInteger(o.formality) || o.formality < 1 || o.formality > 5) return null; formality = o.formality; }
  let budget: Budget | null = null;
  if (o.budget !== null && o.budget !== undefined) {
    const b = o.budget as { min?: unknown; max?: unknown }; const n = (v: unknown) => (v === null || v === undefined ? null : typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 100_000_000 ? v : NaN);
    const min = n(b.min), max = n(b.max);
    if (typeof min === "number" && Number.isNaN(min) || typeof max === "number" && Number.isNaN(max)) return null;
    if (min !== null && max !== null && min > max) return null;
    budget = min === null && max === null ? null : { min, max };
  }
  const audience = o.audience === "men" || o.audience === "women" ? o.audience : "all";
  const skipped = strs(o.skipped, set(QUESTIONS.map((q) => q.id)), 11); if (!skipped) return null;
  const avoidColors = avoid.filter((c) => !colors.includes(c));
  return { departments, kinds, styles: styles.slice(0, 3) as StyleId[], combos: combos as ComboId[], formality, occasions: occasions as Occasion[], colors, avoidColors, seasons: seasons as Season[], budget, brands, audience, skipped: skipped as QuestionId[] };
}
export function sanitizeProfile(raw: unknown, facts: Facts, now = Date.now()): StyleProfile | null {
  const o = raw as { answers?: unknown; createdAt?: unknown } | null;
  const a = o && typeof o === "object" ? sanitizeAnswers(o.answers, facts) : null;
  if (!a) return null;
  return deriveProfile(a, facts, now, typeof o?.createdAt === "number" ? o.createdAt : now); // derived data is always recomputed, never trusted
}

// ======================= personalization settings and signals =======================
/** What the shopper allows the engine to learn from. Everything is OFF until they turn it on. */
export type Consent = { favorites: boolean; outfits: boolean; views: boolean; purchases: boolean };
export const NO_CONSENT: Consent = { favorites: false, outfits: false, views: false, purchases: false };
export type Signals = { favorites: string[]; outfits: string[]; views: Record<string, number>; purchases: string[]; consent: Consent };
export const noSignals = (): Signals => ({ favorites: [], outfits: [], views: {}, purchases: [], consent: { ...NO_CONSENT } });
export function sanitizeSignals(raw: unknown, known: ReadonlySet<string>): Signals {
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<Signals>;
  const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && known.has(x)).slice(0, 300) : []);
  const c = (o.consent ?? {}) as Partial<Consent>;
  const views: Record<string, number> = {};
  if (o.views && typeof o.views === "object") for (const [k, n] of Object.entries(o.views).slice(0, 300)) if (known.has(k) && typeof n === "number" && n > 0) views[k] = Math.min(50, Math.floor(n));
  return { favorites: ids(o.favorites), outfits: ids(o.outfits), views, purchases: ids(o.purchases), consent: { favorites: c.favorites === true, outfits: c.outfits === true, views: c.views === true, purchases: c.purchases === true } };
}

// ======================= product attributes (all derived from catalog records) =======================
const A = (o: Partial<Record<StyleId, number>>) => o;
const DEPT_STYLE: Record<string, Partial<Record<StyleId, number>>> = {
  sportswear: A({ sporty: 1, casual: 0.5, streetwear: 0.4 }), sneakers: A({ sporty: 0.7, streetwear: 0.7, casual: 0.6 }), streetwear: A({ streetwear: 1, casual: 0.5, sporty: 0.3 }),
  luxury: A({ elegant: 1, classic: 0.6, minimalist: 0.4 }), formal: A({ classic: 1, elegant: 0.7, minimalist: 0.4 }), casual: A({ casual: 1, minimalist: 0.5, classic: 0.3 }),
  denim: A({ casual: 0.8, classic: 0.5, streetwear: 0.3 }), accessories: A({ classic: 0.4, minimalist: 0.4, casual: 0.4 }), "new-arrivals": {},
};
const KIND_STYLE: Record<string, Partial<Record<StyleId, number>>> = {
  tee: A({ casual: 0.7, minimalist: 0.4 }), shirt: A({ classic: 0.5, casual: 0.4 }), hoodie: A({ streetwear: 0.6, casual: 0.6, sporty: 0.3 }), jacket: A({ casual: 0.5, classic: 0.4, streetwear: 0.3 }),
  coat: A({ classic: 0.7, elegant: 0.5, minimalist: 0.4 }), suit: A({ classic: 0.8, elegant: 0.8 }), dress: A({ elegant: 0.6, classic: 0.4, casual: 0.3 }), trousers: A({ casual: 0.5, classic: 0.4 }),
  sneaker: A({ sporty: 0.5, streetwear: 0.5, casual: 0.6 }), bag: A({ casual: 0.5, minimalist: 0.4, classic: 0.4 }), watch: A({ classic: 0.6, elegant: 0.6, minimalist: 0.5 }), glasses: A({ classic: 0.5, minimalist: 0.5, streetwear: 0.3 }),
};
/** Which styles a product fits, 0..1. From its department and type, plus "minimalist" when every color is neutral. Rule-based: brands do not tag styles. */
export function styleAffinity(i: StyleItem): Record<StyleId, number> {
  const out = {} as Record<StyleId, number>;
  for (const s of STYLES) out[s] = Math.max(DEPT_STYLE[i.department]?.[s] ?? 0, KIND_STYLE[i.kind]?.[s] ?? 0);
  if (neutralPalette(i) && i.kind !== "hoodie") out.minimalist = Math.min(1, out.minimalist + 0.4);
  return out;
}
export const neutralPalette = (i: Pick<StudioItem, "colors" | "variants">): boolean => { const cs = colorsInStock(i as StudioItem); return cs.length > 0 && cs.every((c) => isNeutralHex(hexFor(i, c.name))); };
const SEASON_BY_KIND: Record<string, Season[]> = {
  tee: ["spring", "summer", "autumn"], shirt: ["spring", "summer", "autumn"], hoodie: ["autumn", "winter", "spring"], jacket: ["spring", "autumn", "winter"], coat: ["autumn", "winter"], suit: ["spring", "summer", "autumn", "winter"],
  trousers: ["spring", "summer", "autumn", "winter"], dress: ["spring", "summer", "autumn"], sneaker: ["spring", "summer", "autumn", "winter"], bag: ["spring", "summer", "autumn", "winter"], watch: ["spring", "summer", "autumn", "winter"], glasses: ["spring", "summer", "autumn"],
};
/** Seasons suited to this TYPE of garment. The catalog has no season field, so this is a general rule about the type, and is worded that way. */
export const seasonsOf = (kind: string): Season[] => SEASON_BY_KIND[kind] ?? [...SEASONS];
const KIND_FORMAL: Record<string, number> = { suit: 0.95, shirt: 0.6, dress: 0.65, coat: 0.6, jacket: 0.45, trousers: 0.5, tee: 0.2, hoodie: 0.15, sneaker: 0.25, bag: 0.5, watch: 0.6, glasses: 0.45 };
const DEPT_FORMAL: Record<string, number> = { formal: 0.25, luxury: 0.15, casual: 0, denim: -0.05, sportswear: -0.15, streetwear: -0.1, sneakers: -0.05 };
export const formalityOf = (i: Pick<StyleItem, "kind" | "department">): number => Math.max(0, Math.min(1, (KIND_FORMAL[i.kind] ?? 0.4) + (DEPT_FORMAL[i.department] ?? 0)));

function similarColor(nameA: string, hexA: string, nameB: string, hexB: string): number {
  if (nameA.toLowerCase() === nameB.toLowerCase()) return 1;
  const a = hexToHsl(hexA), b = hexToHsl(hexB), na = isNeutralHex(hexA), nb = isNeutralHex(hexB);
  if (na && nb) return Math.abs(a.l - b.l) < 0.25 ? 0.5 : 0.3;
  if (na !== nb) return 0;
  const dh = Math.min(Math.abs(a.h - b.h), 360 - Math.abs(a.h - b.h));
  return dh <= 25 && Math.abs(a.l - b.l) <= 0.3 ? 0.6 : 0;
}

// ======================= scoring =======================
export type Part = "department" | "kind" | "style" | "color" | "price" | "season" | "formality" | "occasion" | "tags";
const W: Record<Part, number> = { department: 0.2, kind: 0.16, style: 0.2, color: 0.14, price: 0.06, season: 0.08, formality: 0.1, occasion: 0.04, tags: 0.02 };
export type Reason = { part: Part | "brand" | "signal"; text: string; weight: number };
export type Scored = { item: StyleItem; score: number; parts: Record<Part, number>; /** best matching in-stock color for this shopper */ color: string | null; reasons: Reason[]; explanation: string; boost: number; signalSources: string[] };
export type Names = { department: (slug: string) => string; brand: (slug: string) => string; money: (m: { amount: number; currency: string }) => string; /** hex of a color name used in the catalog, when known */ hex: (name: string) => string | null };

/** Hard rules first: never recommend what is sold out, outside the budget, in avoided colors only, outside the chosen sections, or already bought (when allowed to look at purchases). */
export function passes(i: StyleItem, p: StyleProfile | null, s: Signals): boolean {
  if (!i.available) return false;
  if (!p) return true;
  const d = p.derived;
  if (d.audience !== "all" && i.audience !== "unisex" && i.audience !== d.audience) return false;
  if (d.budget) {
    if (!i.price || i.price.currency !== d.budget.currency) return false; // cannot verify the price → not shown against a budget
    if (d.budget.min !== null && i.price.amount < d.budget.min) return false;
    if (d.budget.max !== null && i.price.amount > d.budget.max) return false;
  }
  if (d.avoidColors.length) { const cs = colorsInStock(i); if (cs.length > 0 && cs.every((c) => d.avoidColors.includes(c.name))) return false; }
  if (s.consent.purchases && s.purchases.includes(i.id)) return false;
  return true;
}

const lower = (x: string) => x.toLowerCase();
const list = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

type Aff = { dept: Map<string, number>; kind: Map<string, number>; brand: Map<string, number>; color: Map<string, number>; total: number; sources: Set<string> };
function affinity(items: readonly StyleItem[], s: Signals): Aff {
  const byId = new Map(items.map((i) => [i.id, i])), a: Aff = { dept: new Map(), kind: new Map(), brand: new Map(), color: new Map(), total: 0, sources: new Set() };
  const add = (id: string, w: number, src: string) => { const it = byId.get(id); if (!it) return; a.total += w; a.sources.add(src); const inc = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + w); inc(a.dept, it.department); inc(a.kind, it.kind); inc(a.brand, it.brand); colorsInStock(it).forEach((c) => inc(a.color, lower(c.name))); };
  if (s.consent.favorites) s.favorites.forEach((id) => add(id, 1, "favorites"));
  if (s.consent.outfits) s.outfits.forEach((id) => add(id, 0.8, "saved outfits"));
  if (s.consent.purchases) s.purchases.forEach((id) => add(id, 1, "purchases"));
  if (s.consent.views) Object.entries(s.views).forEach(([id, n]) => add(id, Math.min(0.5, 0.15 * Math.log2(1 + n)), "views"));
  return a;
}

export function scoreItem(i: StyleItem, p: StyleProfile | null, s: Signals, names: Names, aff?: Aff): Scored {
  const parts = {} as Record<Part, number>; const reasons: Reason[] = []; const d = p?.derived;
  const none = !d;
  const set = (k: Part, v: number) => (parts[k] = v);
  const hasDept = !!d && Object.keys(d.departments).length > 0, hasKind = !!d && Object.keys(d.kinds).length > 0, hasStyle = !!d && Object.keys(d.styles).length > 0;
  set("department", hasDept ? d!.departments[i.department] ?? 0 : 0.5);
  set("kind", hasKind ? d!.kinds[i.kind] ?? 0.1 : 0.5);
  const aff2 = styleAffinity(i); let bestStyle: StyleId | null = null, st = 0;
  if (hasStyle) { for (const [sid, w] of Object.entries(d!.styles)) { const v = (aff2[sid as StyleId] ?? 0) * w; if (v > st) { st = v; bestStyle = sid as StyleId; } } set("style", st); } else set("style", 0.5);
  // color: best in-stock color against the liked ones
  let bestColor: string | null = null; const stock = colorsInStock(i);
  if (d && d.colors.length) {
    let c = 0;
    for (const col of stock) { const hex = hexFor(i, col.name); for (const ln of d.colors) { const lh = names.hex(ln); const v = lh ? similarColor(col.name, hex, ln, lh) : lower(ln) === lower(col.name) ? 1 : 0; if (v > c) { c = v; bestColor = col.name; } } }
    set("color", c);
  } else { set("color", 0.5); bestColor = stock.find((c) => !d?.avoidColors.includes(c.name))?.name ?? stock[0]?.name ?? null; }
  if (d?.avoidColors.length && bestColor && d.avoidColors.includes(bestColor)) bestColor = stock.find((c) => !d.avoidColors.includes(c.name))?.name ?? bestColor;
  if (d?.budget && i.price) { const { min, max } = d.budget, lo = min ?? 0, hi = max ?? Math.max(i.price.amount * 2, lo + 1), mid = (lo + hi) / 2, half = (hi - lo) / 2 || 1; set("price", Math.max(0.7, 0.7 + 0.3 * (1 - Math.min(1, Math.abs(i.price.amount - mid) / half)))); } else set("price", d?.budget ? 0.3 : 0.5);
  const seasons = seasonsOf(i.kind), seasonHit = d?.seasons.filter((x) => seasons.includes(x)) ?? [];
  set("season", d?.seasons.length ? (seasonHit.length ? 1 : 0.2) : 0.5);
  const f = formalityOf(i);
  set("formality", d && d.formality !== null ? 1 - Math.abs(f - d.formality) : 0.5);
  const occHit = d?.occasions.filter((o) => i.occasions.includes(o)) ?? [];
  set("occasion", d?.occasions.length ? (occHit.length ? 1 : 0.2) : 0.5);
  const itemTags = i.tags.map(lower); const tagHits = d ? d.interestTags.filter((t) => itemTags.includes(t)) : [];
  set("tags", d && d.interestTags.length ? Math.min(1, tagHits.length / 2) : 0.5);

  let score = (Object.keys(W) as Part[]).reduce((n, k) => n + W[k] * parts[k], 0);
  const brandHit = !!d && d.brands.includes(i.brand);
  if (brandHit) score += 0.06;
  // learned signals: only the ones the shopper switched on
  let boost = 0; const sources: string[] = [];
  if (aff && aff.total > 0) {
    const share = (m: Map<string, number>, k: string) => Math.min(1, (m.get(k) ?? 0) / aff.total);
    const cs = stock.length ? Math.max(...stock.map((c) => share(aff.color, lower(c.name)))) : 0;
    boost = Math.min(0.12, 0.05 * share(aff.dept, i.department) + 0.05 * share(aff.kind, i.kind) + 0.03 * share(aff.brand, i.brand) + 0.02 * cs);
    if (boost >= 0.025) sources.push(...aff.sources);
    score += boost;
  }
  score = Math.min(1, score);

  // ---- explanation: only facts that are in the record or in the shopper's own answers ----
  if (d) {
    if (hasDept && parts.department === 1) reasons.push({ part: "department", weight: W.department, text: `is in our ${names.department(i.department)} department, one of the areas you chose` });
    if (hasKind && parts.kind >= 0.6) reasons.push({ part: "kind", weight: W.kind * parts.kind, text: `is a ${KIND_NOUN[i.kind] ?? i.categoryName.toLowerCase()}, a type of piece you like` });
    if (bestStyle && st >= 0.6) reasons.push({ part: "style", weight: W.style * st, text: `fits your ${STYLE_INFO[bestStyle].label.toLowerCase()} style${bestStyle === "minimalist" && neutralPalette(i) ? ` (neutral colors: ${list(stock.map((c) => c.name))})` : hasDept && parts.department === 1 ? "" : ` (it comes from our ${names.department(i.department)} department)`}` });
    if (parts.color >= 0.6 && bestColor) reasons.push({ part: "color", weight: W.color * parts.color, text: parts.color === 1 ? `comes in ${bestColor}, a color you chose` : `comes in ${bestColor}, close to colors you chose` });
    if (d.budget && i.price) reasons.push({ part: "price", weight: W.price * 0.9, text: `costs ${names.money(i.price)}, within your budget` });
    if (seasonHit.length) reasons.push({ part: "season", weight: W.season, text: `is a ${KIND_NOUN[i.kind] ?? "piece"}, a type that suits ${list(seasonHit)}, which you chose` });
    if (d.formality !== null && Math.abs(f - d.formality) < 0.2) reasons.push({ part: "formality", weight: W.formality, text: `${f >= 0.6 ? "leans formal" : f <= 0.3 ? "is casual" : "sits between casual and formal"}, like your preference` });
    if (occHit.length) reasons.push({ part: "occasion", weight: W.occasion, text: `suits ${lower(OCCASION_LABEL[occHit[0]!])}, an occasion you chose` });
    if (brandHit) reasons.push({ part: "brand", weight: 0.06, text: `is from ${names.brand(i.brand)}, a brand you picked` });
    if (sources.length) reasons.push({ part: "signal", weight: boost, text: `is similar to items in your ${list(sources)}` });
  }
  reasons.sort((x, y) => y.weight - x.weight);
  const top = reasons.slice(0, 3).map((r) => r.text);
  const noun = KIND_NOUN[i.kind] ?? "piece";
  const explanation = none ? (i.featured ? `A ${noun} featured by the shop.` : `A ${noun} from our ${names.department(i.department)} department.`) : top.length ? `This ${noun} ${list(top)}.` : `This ${noun} is available now and fits your filters.`;
  return { item: i, score: Math.round(score * 1000) / 1000, parts, color: bestColor, reasons, explanation, boost, signalSources: sources };
}
export function rank(items: readonly StyleItem[], p: StyleProfile | null, s: Signals, names: Names): Scored[] {
  const aff = affinity(items, s);
  const out: Scored[] = [];
  for (const i of items) if (passes(i, p, s)) out.push(scoreItem(i, p, s, names, aff));
  return out.sort((a, b) => b.score - a.score || Number(b.item.featured) - Number(a.item.featured) || (a.item.id < b.item.id ? -1 : 1));
}

// ======================= discovery =======================
export type Collection = { id: string; title: string; subtitle: string; items: Scored[] };
export type OutfitRec = { id: string; name: string; why: string; items: { slot: Slot; scored: Scored; color: string | null }[]; picks: Picks; match: number };
export type DeptRec = { slug: string; name: string; count: number; score: number; why: string };
export type Discovery = {
  personalized: boolean; top: Scored[]; collections: Collection[]; outfits: OutfitRec[]; departments: DeptRec[]; accessories: Scored[]; newArrivals: Scored[];
  meta: { signalsUsed: string[]; filters: { budget: boolean; avoidColors: boolean; audience: boolean }; candidates: number; total: number };
};
const ACCESSORY_SLOTS: Slot[] = ["bag", "watch", "glasses"];

export function buildDiscovery(items: readonly StyleItem[], p: StyleProfile | null, s: Signals, names: Names, opts: { limit?: number } = {}): Discovery {
  const limit = opts.limit ?? 12, d = p?.derived;
  const ranked = rank(items, p, s, names), byId = new Map(items.map((i) => [i.id, i]));
  const pool = ranked.map((r) => r.item);
  const take = (f: (r: Scored) => boolean, n = 8) => ranked.filter(f).slice(0, n);
  const collections: Collection[] = [];
  const add = (id: string, title: string, subtitle: string, its: Scored[]) => { if (its.length >= 3) collections.push({ id, title, subtitle, items: its.slice(0, 8) }); };
  if (d) {
    if (d.colors.length) add("colors", "In your colors", `Pieces that come in ${list(d.colors.slice(0, 4))}`, take((r) => r.parts.color >= 0.99).sort((a, b) => b.parts.color - a.parts.color || b.score - a.score));
    for (const sid of Object.keys(d.styles).filter((x) => d.styles[x] === 1).slice(0, 2)) add(`style-${sid}`, `${STYLE_INFO[sid as StyleId].label} picks`, `Matches your ${STYLE_INFO[sid as StyleId].label.toLowerCase()} style`, take((r) => (styleAffinity(r.item)[sid as StyleId] ?? 0) >= 0.7));
    for (const o of d.occasions.slice(0, 2)) add(`occasion-${o}`, `For ${OCCASION_LABEL[o].toLowerCase()}`, `Pieces that suit ${OCCASION_LABEL[o].toLowerCase()}`, take((r) => r.item.occasions.includes(o)));
    for (const se of d.seasons.slice(0, 2)) add(`season-${se}`, `For ${se}`, `Types of pieces that suit ${se}`, take((r) => seasonsOf(r.item.kind).includes(se)));
    if (d.budget) add("budget", "Best matches in your budget", `Every piece is between ${names.money({ amount: d.budget.min ?? 0, currency: d.budget.currency })} and ${d.budget.max !== null ? names.money({ amount: d.budget.max, currency: d.budget.currency }) : "no upper limit"}`, take(() => true));
    const sig = take((r) => r.signalSources.length > 0);
    if (sig.length) add("signals", "Because of what you saved", `Similar to your ${list([...new Set(sig.flatMap((r) => r.signalSources))])}`, sig);
  }
  const top = ranked.slice(0, limit);
  // suggested departments
  const byDept = new Map<string, Scored[]>(); ranked.forEach((r) => { const a = byDept.get(r.item.department) ?? []; a.push(r); byDept.set(r.item.department, a); });
  const departments: DeptRec[] = [...byDept].map(([slug, rs]) => { const top3 = rs.slice(0, 3), sc = top3.reduce((n, r) => n + r.score, 0) / top3.length; return { slug, name: names.department(slug), count: rs.length, score: Math.round(sc * 1000) / 1000, why: d && d.departments[slug] ? `You chose this area. ${rs.length} match${rs.length === 1 ? "es" : ""} your filters.` : `${rs.length} piece${rs.length === 1 ? "" : "s"} match your taste.` }; })
    .filter((x) => x.slug !== "new-arrivals").sort((a, b) => b.score - a.score || (a.slug < b.slug ? -1 : 1)).slice(0, 4);
  const accessories = ranked.filter((r) => r.item.slot && ACCESSORY_SLOTS.includes(r.item.slot)).slice(0, 6);
  const newArrivals = ranked.filter((r) => r.item.isNew).slice(0, 8);
  // outfits built around the best anchors; every piece passes the same hard filters
  const outfits: OutfitRec[] = []; const resolve = (id: string) => byId.get(id);
  const anchors: Scored[] = []; const seenKinds = new Set<string>();
  for (const r of ranked) { if (!r.item.slot || !["base", "dress", "outer", "mid"].includes(r.item.slot)) continue; if (seenKinds.has(r.item.kind) && anchors.length >= 2) continue; seenKinds.add(r.item.kind); anchors.push(r); if (anchors.length >= 3) break; }
  const scoredById = new Map(ranked.map((r) => [r.item.id, r]));
  for (const a of anchors) {
    let picks: Picks = place({}, a.item, { productId: a.item.id, sku: null, size: null, color: a.color }, resolve).picks;
    picks = completeLook(picks, pool, resolve, { occasion: d?.occasions[0] ?? null, audience: d && d.audience !== "all" ? d.audience : "all" }).picks;
    const bag = pool.filter((i) => i.slot === "bag" && !picks.bag).map((i) => scoredById.get(i.id)!).sort((x, y) => y.score - x.score)[0];
    if (bag && !picks.bag) picks = { ...picks, bag: { productId: bag.item.id, sku: null, size: null, color: bag.color } };
    const entries = (Object.entries(picks) as [Slot, NonNullable<Picks[Slot]>][]).flatMap(([slot, pk]) => { const sc = scoredById.get(pk.productId); return sc ? [{ slot, scored: sc, color: pk.color }] : []; });
    if (entries.length < 3) continue;
    const rate = entries.map((e) => rateWorn(e.slot, picks, resolve)?.score ?? 0.7); const match = Math.round((rate.reduce((n, x) => n + x, 0) / rate.length) * 100);
    outfits.push({ id: `outfit-${a.item.id}`, name: `Built around the ${a.item.name}`, why: `Starts from a ${KIND_NOUN[a.item.kind] ?? "piece"} that matches your profile. The other pieces were chosen for color and style compatibility${d?.occasions[0] ? ` and ${lower(OCCASION_LABEL[d.occasions[0]])}` : ""}, and are all available.`, items: entries, picks, match });
  }
  return {
    personalized: !!p, top, collections, outfits, departments, accessories, newArrivals,
    meta: { signalsUsed: [...new Set(top.flatMap((r) => r.signalSources))], filters: { budget: !!d?.budget, avoidColors: !!d?.avoidColors.length, audience: !!d && d.audience !== "all" }, candidates: ranked.length, total: items.length },
  };
}
