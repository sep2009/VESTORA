// Outfit Studio logic. Pure and dependency-free (no imports) so it runs in the browser, on the server and in node tests.
// Every garment in an outfit is a catalog product id; nothing here copies product data.

export const SLOTS = ["base", "mid", "outer", "bottom", "dress", "shoes", "bag", "watch", "glasses"] as const;
export type Slot = (typeof SLOTS)[number];
export const SLOT_LABEL: Record<Slot, string> = { base: "Top", mid: "Hoodie / sweater", outer: "Jacket / coat", bottom: "Bottoms", dress: "Dress", shoes: "Shoes", bag: "Bag", watch: "Watch", glasses: "Eyewear" };

/** Studio categories shown as tabs. */
export const TABS = ["tops", "shirts", "tshirts", "pants", "jeans", "jackets", "hoodies", "dresses", "shoes", "bags", "accessories"] as const;
export type Tab = (typeof TABS)[number];
export const TAB_LABEL: Record<Tab, string> = { tops: "Tops", shirts: "Shirts", tshirts: "T-shirts", pants: "Pants", jeans: "Jeans", jackets: "Jackets", hoodies: "Hoodies", dresses: "Dresses", shoes: "Shoes", bags: "Bags", accessories: "Accessories" };

export const OCCASIONS = ["everyday", "work", "evening", "weekend", "sport"] as const;
export type Occasion = (typeof OCCASIONS)[number];
export const OCCASION_LABEL: Record<Occasion, string> = { everyday: "Everyday", work: "Work", evening: "Evening", weekend: "Weekend", sport: "Sport" };
export type Style = "sport" | "street" | "casual" | "dressy" | "any";

export type StudioVariant = { sku: string; size: string | null; color: string | null; stock: number };
export type StudioItem = {
  id: string; slug: string; name: string; brandName: string; category: string; categoryName: string; kind: string; audience: "men" | "women" | "unisex";
  department: string; featured: boolean; image: string | null; demo: boolean; sourceKind: "official" | "affiliate-feed" | "manual-verified" | "demo"; retailer: string | null; sourceUrl: string | null;
  price: { amount: number; currency: string } | null; compareAt: { amount: number; currency: string } | null;
  variants: StudioVariant[]; colors: { name: string; hex: string | null }[]; sizes: string[];
  /** Body slot this garment is worn in, and the studio tab it is listed under. Null when the studio cannot show this kind. */
  slot: Slot | null; tab: Tab | null; style: Style; occasions: Occasion[];
  /** False when every variant is out of stock (or availability says so). Such items are never offered for purchase. */
  available: boolean;
  bagStyle: "backpack" | "shoulder";
};
export type Pick = { productId: string; sku: string | null; size: string | null; color: string | null };
export type Picks = Partial<Record<Slot, Pick>>;

// ---------- classification ----------
export function slotForKind(kind: string): Slot | null {
  switch (kind) {
    case "tee": case "shirt": return "base";
    case "hoodie": return "mid";
    case "jacket": case "coat": case "suit": return "outer";
    case "trousers": return "bottom";
    case "dress": return "dress";
    case "sneaker": return "shoes";
    case "bag": return "bag";
    case "watch": return "watch";
    case "glasses": return "glasses";
    default: return null;
  }
}
export function tabFor(kind: string, categorySlug: string): Tab | null {
  switch (kind) {
    case "tee": return "tshirts";
    case "shirt": return "shirts";
    case "hoodie": return "hoodies";
    case "jacket": case "coat": case "suit": return "jackets";
    case "dress": return "dresses";
    case "trousers": return /jean|denim/.test(categorySlug) ? "jeans" : "pants";
    case "sneaker": return "shoes";
    case "bag": return "bags";
    case "watch": case "glasses": return "accessories";
    default: return null;
  }
}
/** "Tops" lists every upper-body base layer; the other tabs list their own category. */
export function inTab(i: Pick2<StudioItem, "tab" | "slot">, tab: Tab): boolean { return tab === "tops" ? i.slot === "base" || i.slot === "mid" : i.tab === tab; }
type Pick2<T, K extends keyof T> = { [P in K]: T[P] };

/** Body slots an item takes over. Placing it removes any worn item that overlaps (a dress replaces top and bottoms; a suit replaces jacket and bottoms). */
export function covers(kind: string, slot: Slot): Slot[] {
  if (kind === "dress") return ["dress", "base", "bottom"];
  if (kind === "suit") return ["outer", "bottom"];
  return [slot];
}
export function styleFor(department: string, kind: string): Style {
  if (kind === "suit") return "dressy";
  if (department === "sportswear" || department === "sneakers") return "sport";
  if (department === "streetwear") return "street";
  if (department === "luxury" || department === "formal") return "dressy";
  if (department === "accessories") return "any";
  return "casual";
}
export function occasionsFor(style: Style, kind: string): Occasion[] {
  if (kind === "suit") return ["work", "evening"];
  if (style === "any") return [...OCCASIONS];
  const base: Record<Exclude<Style, "any">, Occasion[]> = { sport: ["sport", "weekend"], street: ["everyday", "weekend"], casual: ["everyday", "weekend"], dressy: ["work", "evening"] };
  const o = [...base[style]];
  if (kind === "dress" && !o.includes("evening")) o.push("evening");
  if (kind === "sneaker" && !o.includes("everyday")) o.push("everyday");
  return o;
}
export const bagStyleFor = (name: string, slug: string): "backpack" | "shoulder" => (/backpack|rucksack|knapsack/i.test(`${name} ${slug}`) ? "backpack" : "shoulder");

// ---------- availability and variants ----------
export const stockOf = (i: StudioItem) => i.variants.reduce((n, v) => n + v.stock, 0);
export const isAvailable = (i: Pick2<StudioItem, "available">) => i.available;
export const variantStock = (i: StudioItem, size: string | null, color: string | null) =>
  i.variants.filter((v) => (size === null || v.size === size) && (color === null || v.color === color)).reduce((n, v) => n + v.stock, 0);
export const colorsInStock = (i: StudioItem) => (i.variants.length ? i.colors.filter((c) => variantStock(i, null, c.name) > 0) : i.colors);
/** The exact variant a pick refers to, when size and color are both settled. */
export function variantOf(i: StudioItem, p: Pick): StudioVariant | null {
  if (i.variants.length === 0) return null;
  const needSize = i.sizes.length > 0, needColor = i.colors.length > 1;
  if ((needSize && !p.size) || (needColor && !p.color)) return null;
  return i.variants.find((v) => (!needSize || v.size === p.size) && (!needColor || v.color === p.color)) ?? (i.colors.length === 1 && !needSize ? i.variants[0] ?? null : null);
}
/** Can this pick go in the cart? Returns the reason it cannot. */
export function purchaseIssue(i: StudioItem | undefined, p: Pick): string | null {
  if (!i) return "no longer in the catalog";
  if (!i.available) return "sold out";
  if (i.sizes.length > 0 && !p.size) return "choose a size";
  if (i.colors.length > 1 && !p.color) return "choose a color";
  const v = variantOf(i, p);
  if (i.variants.length > 0 && (!v || v.stock < 1)) return "that size and color is out of stock";
  return null;
}

// ---------- color ----------
const NAMED: Record<string, string> = { black: "#1c1c1e", ivory: "#ece6d8", navy: "#1f2a44", stone: "#b8b0a2", "slate blue": "#5d7189", charcoal: "#3a3a3d", olive: "#6b6a3f", sand: "#d8c7a3", burgundy: "#6d1f2c", indigo: "#2b3a67", camel: "#b98a52", forest: "#2c4a37", white: "#f4f4f2", grey: "#8a8a8a", gray: "#8a8a8a", red: "#b3261e", blue: "#2f5fa8", green: "#3d7a4f", brown: "#6b4a32", beige: "#d9c9a8", pink: "#e3a6b4", tan: "#c2a073" };
export function hexFor(i: Pick2<StudioItem, "colors">, colorName: string | null): string {
  const c = i.colors.find((x) => x.name === colorName) ?? (colorName ? undefined : i.colors[0]);
  if (c?.hex && /^#[0-9a-f]{6}$/i.test(c.hex)) return c.hex;
  const key = (colorName ?? c?.name ?? "").toLowerCase();
  return NAMED[key] ?? "#8a8a8a";
}
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const n = parseInt(hex.slice(1), 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}
type ColorClass = "neutral" | "earth" | "color";
function classify(hex: string): { cls: ColorClass; h: number } {
  const { h, s, l } = hexToHsl(hex);
  if (s < 0.2 || l < 0.13 || l > 0.82) return { cls: "neutral", h };
  if (h >= 20 && h <= 65 && s < 0.6) return { cls: "earth", h };
  return { cls: "color", h };
}
/** True for blacks, whites, greys and other low-saturation colors. */
export const isNeutralHex = (hex: string): boolean => classify(hex).cls === "neutral";
/** 0..1: how well two colors wear together. Neutrals go with everything; earth tones go with neutrals and blues; otherwise by hue distance. */
export function colorScore(a: string, b: string): { score: number; why: string } {
  const A = classify(a), B = classify(b);
  if (A.cls === "neutral" && B.cls === "neutral") return { score: 0.95, why: "neutral colors" };
  if (A.cls === "neutral" || B.cls === "neutral") return { score: 0.92, why: "a neutral color pairs with most colors" };
  const d = Math.min(Math.abs(A.h - B.h), 360 - Math.abs(A.h - B.h));
  if (A.cls === "earth" && B.cls === "earth") return { score: 0.85, why: "earth tones together" };
  if ((A.cls === "earth") !== (B.cls === "earth")) {
    const other = A.cls === "earth" ? B : A;
    if (other.h >= 190 && other.h <= 260) return { score: 0.88, why: "earth tone with blue is a classic pairing" };
  }
  if (d <= 30) return { score: 0.85, why: "similar hues" };
  if (d >= 150) return { score: 0.75, why: "complementary colors" };
  if (d >= 100 && d <= 140) return { score: 0.55, why: "contrasting colors" };
  return { score: 0.4, why: "colors may compete" };
}

// ---------- style and occasion ----------
const STYLE_TABLE: Record<Exclude<Style, "any">, Record<Exclude<Style, "any">, number>> = {
  sport: { sport: 1, street: 0.8, casual: 0.6, dressy: 0.2 },
  street: { sport: 0.8, street: 1, casual: 0.8, dressy: 0.35 },
  casual: { sport: 0.6, street: 0.8, casual: 1, dressy: 0.6 },
  dressy: { sport: 0.2, street: 0.35, casual: 0.6, dressy: 1 },
};
export function styleScore(a: Style, b: Style): number { return a === "any" || b === "any" ? 0.9 : STYLE_TABLE[a][b]; }

// ---------- outfit state ----------
type Resolve = (productId: string) => StudioItem | undefined;
/** Put an item on the avatar. Keeps every other worn item unless it overlaps, and says what was removed. */
export function place(picks: Picks, item: StudioItem, pick: Pick, resolve: Resolve): { picks: Picks; removed: Slot[] } {
  if (!item.slot) return { picks, removed: [] };
  const mine = new Set(covers(item.kind, item.slot));
  const next: Picks = {};
  const removed: Slot[] = [];
  for (const s of SLOTS) {
    const p = picks[s];
    if (!p) continue;
    const other = resolve(p.productId);
    const theirs = other?.slot ? covers(other.kind, other.slot) : [s];
    if (s === item.slot) { if (p.productId !== item.id) removed.push(s); continue; }
    if (theirs.some((c) => mine.has(c))) { removed.push(s); continue; }
    next[s] = p;
  }
  next[item.slot] = pick;
  return { picks: next, removed: removed.filter((s) => s !== item.slot) };
}
export function removeSlot(picks: Picks, slot: Slot): Picks { const n = { ...picks }; delete n[slot]; return n; }

// ---------- matching ----------
export type Suggestion = { item: StudioItem; color: string | null; score: number; reasons: string[] };
export type MatchOptions = { occasion?: Occasion | null; audience?: "all" | "men" | "women"; exclude?: ReadonlySet<string> };

function members(picks: Picks, resolve: Resolve, cand: StudioItem): { item: StudioItem; hex: string }[] {
  const mine = new Set(cand.slot ? covers(cand.kind, cand.slot) : []);
  const out: { item: StudioItem; hex: string }[] = [];
  for (const s of SLOTS) {
    const p = picks[s]; if (!p) continue;
    const it = resolve(p.productId); if (!it || !it.slot) continue;
    if (covers(it.kind, it.slot).some((c) => mine.has(c))) continue; // would be replaced
    out.push({ item: it, hex: hexFor(it, p.color ?? colorsInStock(it)[0]?.name ?? null) });
  }
  return out;
}
export function scoreCandidate(cand: StudioItem, picks: Picks, resolve: Resolve, opt: MatchOptions = {}): Suggestion | null {
  if (!cand.available) return null; // never suggest what cannot be bought
  const mem = members(picks, resolve, cand);
  const colors = colorsInStock(cand);
  const options = colors.length ? colors : [{ name: null as string | null, hex: null as string | null }];
  let best: { color: string | null; avg: number; why: string } | null = null;
  for (const c of options) {
    const hex = hexFor(cand, c.name);
    let sum = 0, worst = { v: 2, why: "" }, top = { v: -1, why: "" };
    for (const m of mem) { const r = colorScore(hex, m.hex); sum += r.score; if (r.score < worst.v) worst = { v: r.score, why: r.why }; if (r.score > top.v) top = { v: r.score, why: r.why }; }
    const avg = mem.length ? sum / mem.length : 0.8;
    if (!best || avg > best.avg + 1e-9) best = { color: c.name, avg, why: mem.length ? (avg >= 0.8 ? top.why : worst.why) : "" };
  }
  const style = mem.length ? mem.reduce((n, m) => n + styleScore(cand.style, m.item.style), 0) / mem.length : 0.8;
  const occ = !opt.occasion ? 1 : cand.occasions.includes(opt.occasion) ? 1 : 0.2;
  const score = 0.45 * best!.avg + 0.3 * style + 0.25 * occ;
  const reasons: string[] = [];
  if (mem.length && best!.why) reasons.push(`${best!.color ? best!.color + ": " : ""}${best!.why}`);
  if (mem.length && style >= 0.8) reasons.push(cand.style === "any" ? "works with any style" : `${cand.style} style fits your outfit`);
  if (mem.length && style < 0.5) reasons.push("style differs from the rest of the outfit");
  if (opt.occasion) reasons.push(occ === 1 ? `suits ${OCCASION_LABEL[opt.occasion].toLowerCase()}` : `less suited to ${OCCASION_LABEL[opt.occasion].toLowerCase()}`);
  return { item: cand, color: best!.color, score: Math.round(score * 100) / 100, reasons };
}
export function suggest(slot: Slot, picks: Picks, items: readonly StudioItem[], resolve: Resolve, opt: MatchOptions = {}): Suggestion[] {
  const out: Suggestion[] = [];
  for (const it of items) {
    if (it.slot !== slot || opt.exclude?.has(it.id)) continue;
    if (opt.audience && opt.audience !== "all" && it.audience !== "unisex" && it.audience !== opt.audience) continue;
    const s = scoreCandidate(it, picks, resolve, opt); if (s) out.push(s);
  }
  return out.sort((a, b) => b.score - a.score || Number(b.item.featured) - Number(a.item.featured) || (a.item.id < b.item.id ? -1 : 1));
}
/** Rate the items already worn against each other (shown next to each worn item). */
export function rateWorn(slot: Slot, picks: Picks, resolve: Resolve, opt: MatchOptions = {}): { score: number; reasons: string[] } | null {
  const p = picks[slot]; if (!p) return null;
  const it = resolve(p.productId); if (!it) return null;
  const others = { ...picks }; delete others[slot];
  const probe: StudioItem = { ...it, colors: it.colors.filter((c) => c.name === p.color).length ? it.colors.filter((c) => c.name === p.color) : it.colors, variants: it.variants, available: true };
  const s = scoreCandidate(probe, others, resolve, opt);
  return s ? { score: s.score, reasons: s.reasons } : null;
}
const CORE_ORDER: Slot[] = ["base", "bottom", "shoes"];
/** Fill the empty essentials (top, bottoms unless a dress/suit covers them, shoes) with the best available matches. Sizes are left for the shopper to choose. */
export function completeLook(picks: Picks, items: readonly StudioItem[], resolve: Resolve, opt: MatchOptions = {}): { picks: Picks; added: Slot[] } {
  let cur = picks; const added: Slot[] = [];
  for (const slot of CORE_ORDER) {
    const covered = (s: Slot) => SLOTS.some((k) => { const p = cur[k]; const it = p && resolve(p.productId); return it && it.slot && covers(it.kind, it.slot).includes(s); });
    if (covered(slot)) continue;
    const best = suggest(slot, cur, items, resolve, opt)[0]; if (!best) continue;
    cur = place(cur, best.item, { productId: best.item.id, sku: null, size: null, color: best.color }, resolve).picks; added.push(slot);
  }
  return { picks: cur, added };
}

// ---------- avatar config ----------
export const BODY_IDS = ["m1", "m2", "f1", "f2"] as const;
export const HAIR_IDS = ["none", "buzz", "short", "long", "bun", "ponytail"] as const;
export type AvatarConfig = { body: (typeof BODY_IDS)[number]; skin: number; hair: (typeof HAIR_IDS)[number]; hairColor: number };
export const SKIN_TONES = ["#f2d3b8", "#e3b48f", "#c68a62", "#a56a43", "#7a4a2e", "#4f2e1d"] as const;
export const HAIR_COLORS = ["#1b1613", "#4a3021", "#8a5a2b", "#c9a15a", "#8b8b8b", "#7a2f26"] as const;
export const DEFAULT_AVATAR: AvatarConfig = { body: "m1", skin: 1, hair: "short", hairColor: 1 };
export function validAvatar(a: unknown): a is AvatarConfig {
  const o = a as Partial<AvatarConfig> | null;
  return !!o && typeof o === "object" && (BODY_IDS as readonly string[]).includes(o.body as string) && (HAIR_IDS as readonly string[]).includes(o.hair as string)
    && Number.isInteger(o.skin) && o.skin! >= 0 && o.skin! < SKIN_TONES.length && Number.isInteger(o.hairColor) && o.hairColor! >= 0 && o.hairColor! < HAIR_COLORS.length;
}

// ---------- share links ----------
const b64 = {
  enc: (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  dec: (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/")))),
};
/** Compact, URL-safe description of an outfit: product ids and choices only. No personal data. */
export function encodeShare(avatar: AvatarConfig, picks: Picks, name: string): string {
  const i = SLOTS.flatMap((s) => { const p = picks[s]; return p ? [[s, p.productId, p.sku, p.size, p.color]] : []; });
  return b64.enc(JSON.stringify({ v: 1, n: name.slice(0, 60), a: [avatar.body, avatar.skin, avatar.hair, avatar.hairColor], i }));
}
export function decodeShare(code: string): { avatar: AvatarConfig; picks: Picks; name: string } | null {
  try {
    if (!code || code.length > 4000) return null;
    const d = JSON.parse(b64.dec(code)) as { v: number; n?: unknown; a: unknown[]; i: unknown[] };
    if (d.v !== 1 || !Array.isArray(d.a) || !Array.isArray(d.i) || d.i.length > SLOTS.length) return null;
    const avatar = { body: d.a[0], skin: d.a[1], hair: d.a[2], hairColor: d.a[3] };
    if (!validAvatar(avatar)) return null;
    const picks: Picks = {};
    for (const row of d.i) {
      if (!Array.isArray(row)) return null;
      const [slot, productId, sku, size, color] = row as unknown[];
      const str = (v: unknown, max: number) => v === null || (typeof v === "string" && v.length <= max);
      if (typeof slot !== "string" || !(SLOTS as readonly string[]).includes(slot) || typeof productId !== "string" || productId.length > 80 || !str(sku, 60) || !str(size, 20) || !str(color, 40)) return null;
      picks[slot as Slot] = { productId, sku: (sku as string | null) ?? null, size: (size as string | null) ?? null, color: (color as string | null) ?? null };
    }
    return { avatar, picks, name: typeof d.n === "string" ? d.n.slice(0, 60) : "" };
  } catch { return null; }
}
/** Drop picks whose product is gone, and fix a pick whose slot no longer matches its product. Returns what was dropped. */
export function sanitize(picks: Picks, resolve: Resolve): { picks: Picks; dropped: string[] } {
  const out: Picks = {}; const dropped: string[] = [];
  for (const s of SLOTS) {
    const p = picks[s]; if (!p) continue;
    const it = resolve(p.productId);
    if (!it || it.slot !== s) { dropped.push(p.productId); continue; }
    const color = p.color && it.colors.some((c) => c.name === p.color) ? p.color : null;
    const size = p.size && it.sizes.includes(p.size) ? p.size : null;
    const sku = p.sku && it.variants.some((v) => v.sku === p.sku) ? p.sku : null;
    out[s] = { productId: p.productId, sku: color === p.color && size === p.size ? sku : null, size, color };
  }
  // conflicting covers (hand-edited share links): keep the first, drop overlaps
  const seen = new Set<Slot>(); const final: Picks = {};
  for (const s of SLOTS) {
    const p = out[s]; if (!p) continue;
    const it = resolve(p.productId)!; const c = covers(it.kind, it.slot!);
    if (c.some((x) => x !== s && seen.has(x)) || (seen.has(s))) { dropped.push(p.productId); continue; }
    c.forEach((x) => seen.add(x)); final[s] = p;
  }
  return { picks: final, dropped };
}
