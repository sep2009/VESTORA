// Checks the outfit logic (slots, replacement, matching, availability, share codec) against the live catalog.
// Run with the app server up: node scripts/test-outfit-core.mjs [baseUrl]
import * as core from "../src/modules/outfit/core.ts";
const base = process.argv[2] ?? "http://localhost:8765";
let pass = 0, fails = 0;
const t = (name, cond) => { if (cond) pass++; else { fails++; console.log("FAIL", name); } };

// Items come from the studio page's embedded data (server component) via the public search index + product pages is heavy,
// so build StudioItems from /api/catalog (index) and /api/products/[slug] (variants).
const idx = await (await fetch(`${base}/api/catalog`)).json();
const items = [];
for (const i of idx.items) {
  const slot = core.slotForKind(i.kind); if (!slot) continue;
  const d = await (await fetch(`${base}/api/products/${i.slug}`)).json();
  const p = d.product ?? d;
  const variants = p.variants.map((v) => ({ sku: v.sku, size: v.size, color: v.color, stock: v.stock }));
  const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))];
  const names = [...new Set(variants.map((v) => v.color).filter(Boolean))];
  const colors = names.map((n) => ({ name: n, hex: p.colors.find((c) => c.name === n)?.hex ?? null }));
  const style = core.styleFor(i.department, i.kind);
  items.push({ id: i.id, slug: i.slug, name: i.name, brandName: i.brandName, category: i.category, categoryName: i.categoryName, kind: i.kind, audience: i.audience, department: i.department, featured: i.featured, image: i.image, demo: i.demo, sourceKind: "demo", retailer: null, sourceUrl: null, price: i.price, compareAt: i.compareAt, variants, colors, sizes, slot, tab: core.tabFor(i.kind, i.category), style, occasions: core.occasionsFor(style, i.kind), available: variants.reduce((n, v) => n + v.stock, 0) > 0, bagStyle: core.bagStyleFor(i.name, i.slug) });
}
const byId = new Map(items.map((i) => [i.id, i])); const resolve = (id) => byId.get(id);
const first = (kind, pred = () => true) => items.find((i) => i.kind === kind && i.available && pred(i));
const pick = (i, color = null) => ({ productId: i.id, sku: null, size: null, color: color ?? i.colors[0]?.name ?? null });

t("catalog has items for the studio", items.length >= 50);
t("every studio item has a slot and tab", items.every((i) => i.slot && i.tab));
t("all 11 tabs populated", core.TABS.every((tab) => items.some((i) => core.inTab(i, tab))));

// combining and replacing
const tee = first("tee"), pants = first("trousers"), jacket = first("jacket"), shoes = first("sneaker"), bag = first("bag"), watch = first("watch"), glasses = first("glasses"), hoodie = first("hoodie"), dress = first("dress"), suit = first("suit"), shirt = first("shirt");
let o = {};
for (const it of [tee, pants, jacket, shoes, bag, watch, glasses]) o = core.place(o, it, pick(it), resolve).picks;
t("seven garments combine", Object.keys(o).length === 7);
const tee2 = items.find((i) => i.kind === "tee" && i.id !== tee.id && i.available);
let r = core.place(o, tee2, pick(tee2), resolve);
t("replacing top keeps the other six", r.picks.base.productId === tee2.id && Object.keys(r.picks).length === 7 && r.picks.bottom.productId === pants.id);
t("shirt replaces tee in same slot", core.place(o, shirt, pick(shirt), resolve).picks.base.productId === shirt.id);
r = core.place(o, hoodie, pick(hoodie), resolve);
t("hoodie layers over the tee (both kept)", r.picks.mid && r.picks.base && r.removed.length === 0);
r = core.place(o, dress, pick(dress), resolve);
t("dress replaces top and bottoms, keeps jacket/shoes/bag", !r.picks.base && !r.picks.bottom && r.picks.dress && r.picks.outer && r.picks.shoes && r.picks.bag && r.removed.includes("base") && r.removed.includes("bottom"));
const withDress = r.picks;
r = core.place(withDress, tee, pick(tee), resolve);
t("adding a top removes the dress", !r.picks.dress && r.picks.base && r.removed.includes("dress"));
r = core.place(o, suit, pick(suit), resolve);
t("suit replaces jacket and bottoms", r.picks.outer.productId === suit.id && !r.picks.bottom && r.picks.base);
t("remove a slot", !core.removeSlot(o, "shoes").shoes && Object.keys(core.removeSlot(o, "shoes")).length === 6);
t("place does not mutate input", Object.keys(o).length === 7 && o.base.productId === tee.id);

// availability
const sold = items.find((i) => !i.available);
if (sold) {
  t("sold-out item is never suggested", !core.suggest(sold.slot, {}, items, resolve).some((s) => s.item.id === sold.id));
  t("sold-out item has a purchase issue", core.purchaseIssue(sold, pick(sold)) === "sold out");
} else console.log("note: no sold-out item in this catalog; availability gate checked synthetically");
const fake = { ...tee, available: false };
t("synthetic sold-out is excluded", core.scoreCandidate(fake, {}, resolve) === null);
const sized = items.find((i) => i.sizes.length && i.available);
t("size required before purchase", core.purchaseIssue(sized, { productId: sized.id, sku: null, size: null, color: sized.colors[0]?.name ?? null }) === "choose a size");
const oosV = sized.variants.find((v) => v.stock === 0) ? sized : items.find((i) => i.available && i.variants.some((v) => v.stock === 0));
if (oosV) { const v = oosV.variants.find((x) => x.stock === 0); t("out-of-stock variant is refused", /out of stock/.test(core.purchaseIssue(oosV, { productId: oosV.id, sku: v.sku, size: v.size, color: v.color }) ?? "")); }
const goodV = sized.variants.find((v) => v.stock > 0);
t("in-stock variant passes", core.purchaseIssue(sized, { productId: sized.id, sku: goodV.sku, size: goodV.size, color: goodV.color }) === null);

// color and style logic
t("neutral pairs with anything (>= .9)", core.colorScore("#1c1c1e", "#b3261e").score >= 0.9);
t("clashing saturated colors score lower", core.colorScore("#b3261e", "#3d7a4f").score < core.colorScore("#1c1c1e", "#3d7a4f").score);
t("navy + camel is a good pair", core.colorScore("#1f2a44", "#b98a52").score >= 0.85);
t("sport vs dressy is a poor style match", core.styleScore("sport", "dressy") < 0.3 && core.styleScore("casual", "casual") === 1);

// suggestions
const base2 = core.place(core.place({}, tee, pick(tee), resolve).picks, pants, pick(pants), resolve).picks;
const sug = core.suggest("shoes", base2, items, resolve, { occasion: "everyday" });
t("suggestions exist, ranked, all available shoes", sug.length > 1 && sug.every((s) => s.item.slot === "shoes" && s.item.available) && sug.every((s, i) => i === 0 || sug[i - 1].score >= s.score));
t("suggestion carries a color and reasons", !!sug[0].color && sug[0].reasons.length > 0);
const alt = core.suggest("shoes", base2, items, resolve, { exclude: new Set([sug[0].item.id]) });
t("alternatives exclude the shown product", alt.length === sug.length - 1 && alt[0].item.id !== sug[0].item.id);
const formal = core.suggest("outer", core.place({}, shirt, pick(shirt), resolve).picks, items, resolve, { occasion: "work" });
const sportyJ = formal.findIndex((s) => s.item.style === "sport"), dressyJ = formal.findIndex((s) => s.item.style === "dressy");
t("occasion 'work' ranks dressy jackets above sporty ones", dressyJ === -1 || sportyJ === -1 || dressyJ < sportyJ);
const men = core.suggest("base", {}, items, resolve, { audience: "men" });
t("audience filter excludes women-only items", men.every((s) => s.item.audience !== "women"));
t("suggestions are deterministic", JSON.stringify(core.suggest("shoes", base2, items, resolve).map((s) => s.item.id)) === JSON.stringify(core.suggest("shoes", base2, items, resolve).map((s) => s.item.id)));
const cl = core.completeLook(core.place({}, jacket, pick(jacket), resolve).picks, items, resolve, { occasion: "everyday" });
t("complete-look fills top, bottoms, shoes and keeps the jacket", cl.added.length === 3 && cl.picks.base && cl.picks.bottom && cl.picks.shoes && cl.picks.outer.productId === jacket.id);
const cl2 = core.completeLook(core.place({}, dress, pick(dress), resolve).picks, items, resolve);
t("complete-look leaves a dress alone (only adds shoes)", cl2.added.join() === "shoes" && cl2.picks.dress && !cl2.picks.base && !cl2.picks.bottom);
t("rateWorn returns a score", core.rateWorn("shoes", core.place(base2, shoes, pick(shoes), resolve).picks, resolve)?.score > 0);

// share codec
const av = { body: "f2", skin: 3, hair: "bun", hairColor: 2 };
const code = core.encodeShare(av, o, "Weekend ★ look");
const back = core.decodeShare(code);
t("share round-trips avatar, picks and name", back && JSON.stringify(back.avatar) === JSON.stringify(av) && JSON.stringify(back.picks) === JSON.stringify(o) && back.name === "Weekend ★ look");
t("share code is URL-safe and short", /^[A-Za-z0-9_-]+$/.test(code) && code.length < 1500);
t("garbage share codes are rejected", ["", "abc", "!!!", core.encodeShare(av, o, "x").slice(0, 20)].every((c) => core.decodeShare(c) === null));
const evil = (o2) => core.decodeShare(Buffer.from(JSON.stringify(o2)).toString("base64url"));
t("bad avatar rejected", evil({ v: 1, a: ["zz", 0, "none", 0], i: [] }) === null);
t("unknown slot rejected", evil({ v: 1, a: ["m1", 0, "none", 0], i: [["wings", "x", null, null, null]] }) === null);
t("oversized fields rejected", evil({ v: 1, a: ["m1", 0, "none", 0], i: [["base", "x".repeat(200), null, null, null]] }) === null);
t("script in name is only data", back && evil({ v: 1, n: "<script>", a: ["m1", 0, "none", 0], i: [] }).name === "<script>");
const sn = core.sanitize({ ...o, shoes: { productId: "nope-1", sku: null, size: null, color: null }, bag: { productId: tee.id, sku: null, size: null, color: null } }, resolve);
t("sanitize drops unknown products and wrong-slot products", !sn.picks.shoes && !sn.picks.bag && sn.dropped.length === 2 && sn.picks.base);
const sn2 = core.sanitize({ base: { productId: tee.id, sku: "FAKE", size: "ZZ", color: "Neon" } }, resolve);
t("sanitize clears stale variant choices", sn2.picks.base.sku === null && sn2.picks.base.size === null && sn2.picks.base.color === null);
t("sanitize drops overlapping dress + top", Object.keys(core.sanitize({ base: pick(tee), dress: pick(dress) }, resolve).picks).length === 1);
t("avatar validation", core.validAvatar(core.DEFAULT_AVATAR) && !core.validAvatar({ ...core.DEFAULT_AVATAR, skin: 99 }) && !core.validAvatar(null));

console.log(`${pass} passed, ${fails} failed`); process.exit(fails ? 1 : 0);
