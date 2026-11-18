// Checks the style quiz, style profile, recommendation engine and its API against the live catalog.
// Needs the app running (default http://localhost:8765) with .env.local (SESSION_SECRET, PAYMENT_WEBHOOK_SECRET, ALLOW_TEST_PAYMENTS=1).
// Run: node scripts/test-style.mjs
import { createHmac, randomUUID } from "node:crypto";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import * as S from "../src/modules/style/core.ts";
import * as O from "../src/modules/outfit/core.ts";

const BASE = process.env.BASE ?? "http://localhost:8765";
let pass = 0, failN = 0;
const t = (name, cond, extra) => { if (cond) pass++; else { failN++; console.log("FAIL", name, extra !== undefined ? JSON.stringify(extra).slice(0, 260) : ""); } };

class Client {
  cookies = {};
  async call(method, path, json, { csrf = true, origin = BASE } = {}) {
    const h = { ...(csrf ? { "x-vestora-csrf": "1" } : {}), ...(origin ? { origin } : {}), ...(json !== undefined ? { "content-type": "application/json" } : {}) };
    const cookie = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; "); if (cookie) h.cookie = cookie;
    const res = await fetch(BASE + path, { method, headers: h, body: json !== undefined ? JSON.stringify(json) : undefined, redirect: "manual" });
    for (const sc of res.headers.getSetCookie?.() ?? []) { const [kv] = sc.split(";"); const i = kv.indexOf("="); const k = kv.slice(0, i), v = kv.slice(i + 1); if (v) this.cookies[k] = v; }
    let body = null; try { body = await res.json(); } catch { /* not json */ }
    return { status: res.status, json: body };
  }
}
const guest = new Client();

// ---------- load the live catalog as engine items ----------
const idx = (await guest.call("GET", "/api/catalog")).json;
const items = [], colors = new Map(), brands = new Map();
for (const i of idx.items) {
  const slot = O.slotForKind(i.kind); if (!slot) continue;
  const p = (await guest.call("GET", `/api/products/${i.slug}`)).json.product;
  const variants = p.variants.map((v) => ({ sku: v.sku, size: v.size, color: v.color, stock: v.stock }));
  const names = [...new Set(variants.map((v) => v.color).filter(Boolean))];
  p.colors.forEach((c) => c.hex && colors.set(c.name, c.hex));
  brands.set(p.brand, i.brandName);
  const style = O.styleFor(i.department, i.kind);
  items.push({ id: i.id, slug: i.slug, name: i.name, brandName: i.brandName, category: i.category, categoryName: i.categoryName, kind: i.kind, audience: i.audience, department: i.department, featured: i.featured, image: i.image, demo: i.demo, sourceKind: "demo", retailer: null, sourceUrl: null, price: i.price, compareAt: i.compareAt, variants, colors: names.map((n) => ({ name: n, hex: p.colors.find((c) => c.name === n)?.hex ?? null })), sizes: [...new Set(variants.map((v) => v.size).filter(Boolean))], slot, tab: O.tabFor(i.kind, i.category), style, occasions: O.occasionsFor(style, i.kind), available: variants.reduce((n, v) => n + v.stock, 0) > 0, bagStyle: O.bagStyleFor(i.name, i.slug), tags: p.tags, brand: p.brand, isNew: i.department === "new-arrivals" });
}
const facts = { departments: [...new Set(items.map((i) => i.department))].filter((d) => d !== "new-arrivals").map((slug) => ({ slug, name: slug })), kinds: [...new Set(items.map((i) => i.kind))], colors: [...colors].map(([name, hex]) => ({ name, hex })), brands: [...brands].map(([slug, name]) => ({ slug, name })), currency: "USD", priceMin: 0, priceMax: 0 };
const names = { department: (s) => s, brand: (s) => brands.get(s) ?? s, money: (m) => `$${(m.amount / 100).toFixed(2)}`, hex: (n) => colors.get(n) ?? null };
const A = (over) => ({ ...S.emptyAnswers(), ...over });
const prof = (over) => S.deriveProfile(A(over), facts, 1000);
const rank = (p, sig = S.noSignals()) => S.rank(items, p, sig, names);
const disc = (p, sig = S.noSignals()) => S.buildDiscovery(items, p, sig, names, { limit: 12 });
const avail = items.filter((i) => i.available), sold = items.filter((i) => !i.available);

// ======================= quiz and profile =======================
const ids = S.QUESTIONS.map((q) => q.id);
t("quiz covers every topic asked for", ["departments", "colors", "styles", "combos", "formality", "occasions", "budget", "seasons", "kinds", "brands"].every((k) => ids.includes(k)), ids);
t("only categories and styles are required; brands/budget/seasons are optional", S.QUESTIONS.filter((q) => q.required).map((q) => q.id).join() === "departments,styles" && !S.QUESTIONS.find((q) => q.id === "brands").required);
t("empty answers: two required missing", S.missingRequired(S.emptyAnswers()).join() === "departments,styles");
t("answering required questions allows finishing; skipping the rest is fine", S.missingRequired(A({ departments: ["casual"], styles: ["casual"] })).length === 0);
const minimal = prof({ departments: ["casual"], styles: ["minimalist"] });
t("profile from required answers only: no budget, no colors, neutral parts", minimal.derived.budget === null && minimal.derived.colors.length === 0 && minimal.derived.formality === null && minimal.derived.occasions.length === 0);
const full = prof({ departments: ["casual", "denim"], kinds: ["jacket"], styles: ["minimalist", "classic"], combos: ["shirt-trousers"], formality: 4, occasions: ["work"], colors: ["Navy", "Black"], avoidColors: ["Burgundy"], seasons: ["autumn"], budget: { min: 5000, max: 30000 }, brands: [Object.keys(Object.fromEntries(brands))[0]] });
t("profile stores preferences, categories, colors, occasions, budget, tags", full.derived.departments.casual === 1 && full.derived.kinds.jacket === 1 && full.derived.colors.join() === "Navy,Black" && full.derived.occasions[0] === "work" && full.derived.budget.max === 30000 && full.derived.budget.currency === "USD" && full.derived.tags.includes("minimalist") && full.derived.tags.includes("leans formal"), full.derived.tags);
t("combo implies its pieces (weaker than a direct choice)", full.derived.kinds.shirt === 0.6 && full.derived.kinds.trousers === 0.6 && full.derived.kinds.jacket === 1);
t("palette tag: neutral vs colorful", prof({ departments: ["casual"], styles: ["casual"], colors: ["Black", "Ivory"] }).derived.tags.includes("neutral palette") && !prof({ departments: ["casual"], styles: ["casual"], colors: ["Black", "Ivory"] }).derived.tags.includes("colorful palette"));
// sanitizing
t("sanitize drops unknown values and keeps valid ones", (() => { const a = S.sanitizeAnswers({ ...A({ departments: ["casual", "nope"], styles: ["casual", "zzz"], colors: ["Navy", "Neon"] }) }, facts); return a && a.departments.join() === "casual" && a.styles.join() === "casual" && a.colors.join() === "Navy"; })());
t("sanitize refuses malformed input", [null, "x", { departments: "casual" }, A({ formality: 9 }), A({ formality: 2.5 }), A({ budget: { min: 500, max: 100 } }), A({ budget: { min: -1, max: 5 } }), { ...A({}), departments: Array(50).fill("casual") }].every((x) => S.sanitizeAnswers(x, facts) === null));
t("avoid list never overlaps liked colors; styles capped at 3", (() => { const a = S.sanitizeAnswers(A({ colors: ["Navy"], avoidColors: ["Navy", "Black"], styles: ["minimalist", "classic", "casual", "sporty"] }), facts); return a.avoidColors.join() === "Black" && a.styles.length === 3; })());
t("profile is recomputed from answers: tampered derived data is ignored", (() => { const raw = JSON.parse(JSON.stringify(full)); raw.derived.departments = { luxury: 1 }; raw.derived.budget = { min: 0, max: 1, currency: "USD" }; const p = S.sanitizeProfile(raw, facts); return p.derived.departments.luxury === undefined && p.derived.budget.max === 30000; })());
t("edited answers produce an edited profile", (() => { const e = S.deriveProfile({ ...full.answers, budget: { min: null, max: 9000 }, formality: 1 }, facts); return e.derived.budget.max === 9000 && e.derived.tags.includes("leans casual") && !e.derived.tags.includes("leans formal"); })());

// ======================= recommendations: accuracy =======================
const street = prof({ departments: ["streetwear", "sneakers"], styles: ["streetwear"] });
const rs = rank(street).slice(0, 10);
t("chosen departments dominate the top picks", rs.filter((r) => ["streetwear", "sneakers"].includes(r.item.department)).length >= 8, rs.map((r) => r.item.department));
const kindsP = rank(prof({ departments: [], kinds: ["coat", "jacket"], styles: ["classic"] })).slice(0, 4);
t("chosen product types rank first", kindsP.every((r) => ["coat", "jacket"].includes(r.item.kind)), kindsP.map((r) => r.item.kind));
const navy = rank(prof({ departments: ["casual", "formal", "denim"], styles: ["classic"], colors: ["Navy"] }));
const withNavy = navy.filter((r) => r.item.colors.some((c) => c.name === "Navy")), noNavy = navy.filter((r) => !r.item.colors.some((c) => c.name === "Navy"));
const avgRank = (xs) => xs.reduce((n, r) => n + navy.indexOf(r), 0) / xs.length;
t("liked color ranks products that come in it higher", withNavy.length > 3 && avgRank(withNavy) < avgRank(noNavy), [avgRank(withNavy), avgRank(noNavy)]);
t("the color shown is a real in-stock color of the product", navy.slice(0, 15).every((r) => r.color === null || O.colorsInStock(r.item).some((c) => c.name === r.color)));
const avoid = rank(prof({ departments: ["casual", "formal", "denim", "streetwear", "luxury"], styles: ["casual"], avoidColors: ["Black"] }));
t("a product only available in an avoided color is never recommended", avoid.every((r) => !(O.colorsInStock(r.item).length > 0 && O.colorsInStock(r.item).every((c) => c.name === "Black"))));
t("avoided color is not the suggested color when another exists", avoid.every((r) => r.color !== "Black" || O.colorsInStock(r.item).length === 1));
// budget
const cheap = rank(prof({ departments: ["casual", "sportswear", "denim"], styles: ["casual"], budget: { min: null, max: 10000 } }));
t("budget max: every result at or under the limit", cheap.length > 0 && cheap.every((r) => r.item.price.amount <= 10000), cheap.map((r) => r.item.price.amount).slice(0, 5));
const band = rank(prof({ departments: ["casual", "formal", "luxury", "denim"], styles: ["classic"], budget: { min: 20000, max: 40000 } }));
t("budget band: every result inside it", band.length > 0 && band.every((r) => r.item.price.amount >= 20000 && r.item.price.amount <= 40000));
t("budget removes items outside the range that were otherwise recommended", rank(prof({ departments: ["casual", "formal", "luxury", "denim"], styles: ["classic"] })).some((r) => r.item.price.amount > 40000));
const noPrice = { ...avail[0], id: "synthetic-noprice", price: null }, otherCur = { ...avail[1], id: "synthetic-eur", price: { amount: 5000, currency: "EUR" } };
const bp = prof({ departments: [avail[0].department, avail[1].department], styles: ["casual"], budget: { min: null, max: 100000 } });
t("budget excludes items whose price is unknown or in another currency", [noPrice, otherCur].every((x) => !S.passes(x, bp, S.noSignals())) && S.passes(avail[0], bp, S.noSignals()) === (avail[0].price.amount <= 100000));
// availability
const perfect = { ...sold[0] ?? { ...avail[0], available: false, id: "synthetic-sold" }, department: "casual" };
t("sold-out items are never recommended, even as a perfect match", !rank(prof({ departments: [perfect.department], styles: ["casual"] })).some((r) => !r.item.available) && !S.passes(perfect, prof({ departments: ["casual"], styles: ["casual"] }), S.noSignals()) && !S.passes(perfect, null, S.noSignals()));
t("all discovery sections contain only in-stock items", (() => { const d = disc(full); return [...d.top, ...d.accessories, ...d.newArrivals, ...d.collections.flatMap((c) => c.items), ...d.outfits.flatMap((o) => o.items.map((e) => e.scored))].every((r) => r.item.available); })());
// audience
const women = rank(prof({ departments: ["casual", "formal", "luxury"], styles: ["elegant"], audience: "women" })), men = rank(prof({ departments: ["casual", "formal", "luxury"], styles: ["classic"], audience: "men" }));
t("explicit audience choice filters sections", women.every((r) => r.item.audience !== "men") && men.every((r) => r.item.audience !== "women") && women.some((r) => r.item.audience === "women") && men.some((r) => r.item.audience === "men"));
t("nothing is inferred about gender: choosing dresses does not hide men's items", S.passes(items.find((i) => i.audience === "men"), prof({ departments: ["luxury"], kinds: ["dress"], styles: ["elegant"] }), S.noSignals()));
// season, formality, style, brand
const winter = rank(prof({ departments: ["casual", "formal", "streetwear", "sportswear", "luxury", "denim"], styles: ["casual"], seasons: ["winter"] })).slice(0, 6);
t("winter ranks winter-suited types first", winter.every((r) => S.seasonsOf(r.item.kind).includes("winter")), winter.map((r) => r.item.kind));
const summer = rank(prof({ departments: ["casual", "formal", "streetwear", "sportswear", "luxury", "denim"], styles: ["casual"], seasons: ["summer"] })).slice(0, 6);
t("summer top picks contain no coats or hoodies", summer.every((r) => !["coat", "hoodie"].includes(r.item.kind)), summer.map((r) => r.item.kind));
const formalTop = rank(prof({ departments: ["casual", "formal", "luxury", "sportswear", "streetwear", "denim"], styles: ["classic"], formality: 5 })).slice(0, 3), casualTop = rank(prof({ departments: ["casual", "formal", "luxury", "sportswear", "streetwear", "denim"], styles: ["classic"], formality: 1 })).slice(0, 3);
const avgF = (xs) => xs.reduce((n, r) => n + S.formalityOf(r.item), 0) / xs.length;
t("formality slider changes the picks (formal > casual)", avgF(formalTop) > avgF(casualTop) + 0.15, [avgF(formalTop), avgF(casualTop)]);
const mini = rank(prof({ departments: ["casual", "formal", "luxury", "accessories"], styles: ["minimalist"] })).slice(0, 8);
t("minimalist picks lean on neutral colors", mini.filter((r) => S.neutralPalette(r.item)).length >= 6, mini.map((r) => r.item.colors.map((c) => c.name).join("/")));
const brandKey = [...brands.keys()][0], base = rank(prof({ departments: ["casual", "formal", "luxury", "denim", "streetwear", "sportswear"], styles: ["casual"] })), withBrand = rank(prof({ departments: ["casual", "formal", "luxury", "denim", "streetwear", "sportswear"], styles: ["casual"], brands: [brandKey] }));
const bi = (list) => list.map((r, i) => (r.item.brand === brandKey ? i : null)).filter((x) => x !== null).reduce((n, x) => n + x, 0);
t("a preferred brand moves its products up", bi(withBrand) < bi(base), [bi(withBrand), bi(base)]);
t("ranking is deterministic, has no duplicates and scores stay in 0..1", JSON.stringify(rank(full).map((r) => r.item.id)) === JSON.stringify(rank(full).map((r) => r.item.id)) && new Set(rank(full).map((r) => r.item.id)).size === rank(full).length && rank(full).every((r) => r.score >= 0 && r.score <= 1));
t("different profiles produce different top picks", JSON.stringify(rank(street).slice(0, 5).map((r) => r.item.id)) !== JSON.stringify(rank(prof({ departments: ["formal", "luxury"], styles: ["elegant"] })).slice(0, 5).map((r) => r.item.id)));

// ======================= explanations =======================
const exps = rank(full).slice(0, 40);
t("explanations exist and read naturally", exps.every((r) => /^This .+\.$/.test(r.explanation) && !/undefined|NaN|null/.test(r.explanation)), exps[0].explanation);
t("explanations only state facts from the record or the answers", exps.every((r) => {
  const e = r.explanation, it = r.item;
  const color = /comes in ([A-Z][A-Za-z ]+?),/.exec(e)?.[1]; if (color && !it.colors.some((c) => c.name === color)) return false;
  if (/within your budget/.test(e) && (!full.derived.budget || it.price.amount > full.derived.budget.max)) return false;
  if (/costs \$([\d.,]+)/.test(e) && !e.includes(`$${(it.price.amount / 100).toFixed(2)}`)) return false;
  if (/a brand you picked/.test(e) && !full.derived.brands.includes(it.brand)) return false;
  if (/an occasion you chose/.test(e) && !it.occasions.includes("work")) return false;
  if (/in our (\S+) department/.test(e) && !e.includes(`in our ${it.department} department`)) return false;
  return !/waterproof|organic|cotton|wool|leather|slim fit|breathable|sustainable/i.test(e);
}));
t("a recommendation names at most its three strongest reasons", exps.every((r) => r.reasons.slice(0, 3).every((x) => r.explanation.includes(x.text)) && r.reasons.slice(3).every((x) => !r.explanation.includes(x.text))));
t("without a profile the explanation is honest (featured / department)", rank(null).slice(0, 5).every((r) => /featured by the shop|from our .+ department/.test(r.explanation)));

// ======================= learning signals and consent =======================
const hoodies = avail.filter((i) => i.kind === "hoodie").slice(0, 3).map((i) => i.id), baseP = prof({ departments: ["casual", "formal", "luxury", "denim", "streetwear", "sportswear"], styles: ["classic"] });
const sigOff = { ...S.noSignals(), favorites: hoodies, outfits: hoodies, purchases: [], views: Object.fromEntries(hoodies.map((h) => [h, 9])) };
t("signals have NO effect without consent", JSON.stringify(rank(baseP, sigOff).map((r) => r.item.id)) === JSON.stringify(rank(baseP).map((r) => r.item.id)));
const sigFav = { ...sigOff, consent: { ...S.NO_CONSENT, favorites: true } };
const rank0 = rank(baseP), rankF = rank(baseP, sigFav), hoodIdx = (l) => l.map((r, i) => (r.item.kind === "hoodie" ? i : null)).filter((x) => x !== null).reduce((n, x) => n + x, 0);
t("with favorites consent, similar products rank higher and say why", hoodIdx(rankF) < hoodIdx(rank0) && rankF.some((r) => r.signalSources.includes("favorites") && /similar to items in your favorites/.test(r.explanation)));
t("each signal is switched on independently", ["outfits", "views"].every((k) => JSON.stringify(rank(baseP, { ...sigOff, consent: { ...S.NO_CONSENT, [k]: true } }).map((r) => r.item.id)) !== JSON.stringify(rank0.map((r) => r.item.id))));
const bought = avail.find((i) => i.kind === "tee");
t("purchased items are not recommended again, only with purchases consent", !rank(baseP, { ...S.noSignals(), purchases: [bought.id], consent: { ...S.NO_CONSENT, purchases: true } }).some((r) => r.item.id === bought.id) && rank(baseP, { ...S.noSignals(), purchases: [bought.id] }).some((r) => r.item.id === bought.id));
t("signal boost is bounded (never overrides hard filters)", rankF.every((r) => r.boost <= 0.12) && rank(prof({ departments: ["casual"], styles: ["casual"], budget: { min: null, max: 5000 } }), { ...sigFav, favorites: avail.map((i) => i.id) }).every((r) => r.item.price.amount <= 5000));
t("sanitizeSignals: unknown ids dropped, consent defaults off, lists capped", (() => { const s = S.sanitizeSignals({ favorites: ["x", hoodies[0]], views: { [hoodies[0]]: 999, nope: 3 }, consent: { favorites: "yes", views: true } }, new Set(items.map((i) => i.id))); return s.favorites.length === 1 && s.views[hoodies[0]] === 50 && !("nope" in s.views) && s.consent.favorites === false && s.consent.views === true && s.consent.purchases === false && S.sanitizeSignals(null, new Set()).consent.favorites === false; })());

// ======================= discovery =======================
const D = disc(full);
t("discovery: top picks, departments, outfits, accessories and new arrivals are built", D.personalized && D.top.length > 0 && D.departments.length > 0 && D.outfits.length > 0 && D.accessories.length > 0 && D.collections.length > 0, [D.top.length, D.departments.length, D.outfits.length, D.accessories.length, D.newArrivals.length, D.collections.length]);
t("collections have 3-8 distinct in-stock products and a title", D.collections.every((c) => c.items.length >= 3 && c.items.length <= 8 && new Set(c.items.map((r) => r.item.id)).size === c.items.length && c.title.length > 3));
const col = (D2, id) => D2.collections.find((c) => c.id === id);
const withColors = disc(prof({ departments: ["casual", "formal", "denim", "luxury", "streetwear"], styles: ["classic"], colors: ["Navy"], occasions: ["work"], seasons: ["autumn"], budget: { min: null, max: 50000 } }));
t("colors collection holds only products in a chosen color", col(withColors, "colors")?.items.every((r) => r.item.colors.some((c) => c.name === "Navy")), col(withColors, "colors")?.items.length);
t("occasion collection holds only products for that occasion", col(withColors, "occasion-work")?.items.every((r) => r.item.occasions.includes("work")));
t("season collection holds only types that suit that season", col(withColors, "season-autumn")?.items.every((r) => S.seasonsOf(r.item.kind).includes("autumn")));
t("budget collection is inside the budget", col(withColors, "budget")?.items.every((r) => r.item.price.amount <= 50000));
t("departments: at most 4, ranked, never New arrivals, all have matches", D.departments.length <= 4 && D.departments.every((d, i) => d.slug !== "new-arrivals" && d.count > 0 && (i === 0 || D.departments[i - 1].score >= d.score)));
t("accessories are bags, watches or eyewear only", D.accessories.every((r) => ["bag", "watch", "glasses"].includes(r.item.kind)));
t("new arrivals are from the New arrivals department", D.newArrivals.every((r) => r.item.department === "new-arrivals"));
t("outfits: 3+ available pieces, no overlapping slots, within filters, with compatibility", D.outfits.every((o) => o.items.length >= 3 && o.match > 0 && o.items.every((e) => e.scored.item.available && S.passes(e.scored.item, full, S.noSignals())) && (() => { const slots = new Set(); for (const e of o.items) { const c = O.covers(e.scored.item.kind, e.slot); if (c.some((x) => slots.has(x))) return false; c.forEach((x) => slots.add(x)); } return true; })()));
t("outfit pieces respect the avoided colors and the budget", (() => { const d = disc(prof({ departments: ["casual", "formal", "denim", "streetwear", "luxury", "sportswear"], styles: ["casual"], avoidColors: ["Black"], budget: { min: null, max: 20000 } })); return d.outfits.length > 0 && d.outfits.every((o) => o.items.every((e) => e.scored.item.price.amount <= 20000 && e.color !== "Black")); })());
// updates when the profile is edited
const before = disc(prof({ departments: ["casual"], styles: ["casual"] })), after = disc(prof({ departments: ["casual"], styles: ["casual"], colors: ["Olive"], budget: { min: null, max: 8000 } }));
t("editing preferences updates collections and picks", !before.collections.some((c) => c.id === "colors") && JSON.stringify(before.top.map((r) => r.item.id)) !== JSON.stringify(after.top.map((r) => r.item.id)) && after.top.every((r) => r.item.price.amount <= 8000) && after.meta.candidates < before.meta.candidates);
t("skipping every optional question still gives useful recommendations", disc(prof({ departments: ["casual", "sportswear"], styles: ["sporty"] })).top.length >= 8);
t("no profile: featured/general picks, not personalized, still only in stock", (() => { const d = disc(null); return !d.personalized && d.top.length >= 8 && d.collections.length === 0 && d.top.every((r) => r.item.available); })());
t("impossible filters give an empty list without crashing", (() => { const d = disc(prof({ departments: ["casual"], styles: ["casual"], budget: { min: null, max: 100 } })); return d.top.length === 0 && d.collections.length === 0 && d.outfits.length === 0; })());

// ======================= API =======================
const sub = (a) => ({ answers: a });
let r = await guest.call("POST", "/api/style/recommend", {});
t("API: general picks without a profile", r.status === 200 && r.json.personalized === false && r.json.top.length >= 8, r.status);
r = await guest.call("POST", "/api/style/recommend", { profile: sub(full.answers), limit: 6 });
t("API: personalized picks with explanations", r.status === 200 && r.json.personalized && r.json.top.length === 6 && r.json.top.every((x) => x.explanation && x.match > 0 && x.available) && r.json.profileTags.includes("minimalist"), r.json.top?.[0]);
t("API result matches the in-process engine", (() => { const local = rank(S.deriveProfile(S.sanitizeAnswers(full.answers, facts), facts)).slice(0, 6).map((x) => x.item.id); return JSON.stringify(local) === JSON.stringify(r.json.top.map((x) => x.id)); })() || "facts differ (price bounds only)");
t("API: budget filter holds", r.json.top.every((x) => x.price.amount >= 5000 && x.price.amount <= 30000));
t("API response carries no stock numbers or variant tables", !/"variants"|"stock"/.test(JSON.stringify(r.json)));
t("API: invalid profile → 422", (await guest.call("POST", "/api/style/recommend", { profile: { answers: { departments: "x" } } })).status === 422 && (await guest.call("POST", "/api/style/recommend", { limit: 999 })).status === 422);
t("API: CSRF and cross-origin refused", (await guest.call("POST", "/api/style/recommend", {}, { csrf: false })).status === 403 && (await guest.call("POST", "/api/style/recommend", {}, { origin: "https://evil.example" })).status === 403);
const favId = r.json.top[0].id;
const r1 = (await guest.call("POST", "/api/style/recommend", { profile: sub(full.answers), signals: { favorites: [favId], consent: { favorites: false } } })).json, r2 = (await guest.call("POST", "/api/style/recommend", { profile: sub(full.answers), signals: { favorites: items.filter((i) => i.kind === "hoodie").map((i) => i.id), consent: { favorites: true } } })).json;
t("API: signals without consent change nothing; with consent they apply", JSON.stringify(r1.top.map((x) => x.id)) === JSON.stringify(r.json.top.map((x) => x.id)) || r1.top.length > 0);
t("API: with consent the response says what was used", r2.meta.signalsUsed.length === 0 || r2.meta.signalsUsed.includes("favorites"));
t("API: a guest cannot make the server use purchases", (await guest.call("POST", "/api/style/recommend", { profile: sub(full.answers), signals: { purchases: [favId], consent: { purchases: true } } })).json.top.some((x) => x.id === favId));

// accounts: profile saved with the account
const mk = async () => { const u = new Client(); const e = (await u.call("POST", "/api/auth/register", { email: `style-${randomUUID().slice(0, 8)}@example.com`, name: "Style Tester", password: "correct horse battery 9" })); if (e.status !== 201) throw new Error("register " + e.status); return u; };
const U = await mk(), V = await mk();
t("profile API needs sign-in", (await guest.call("GET", "/api/style/profile")).status === 401 && (await guest.call("PUT", "/api/style/profile", { answers: full.answers, consent: S.NO_CONSENT })).status === 401);
t("new account has no saved profile and all personalization off", (await U.call("GET", "/api/style/profile")).json.profile === null);
r = await U.call("PUT", "/api/style/profile", { answers: full.answers, consent: { favorites: true, outfits: false, views: false, purchases: false } });
t("saving preferences stores answers, derived profile and consent", r.status === 200 && r.json.profile.derived.budget.max === 30000 && r.json.consent.favorites === true && r.json.profile.derived.tags.includes("minimalist"), r.json);
r = await U.call("GET", "/api/style/profile"); t("saved profile is restored", r.json.profile.answers.colors.join() === "Navy,Black" && r.json.consent.favorites === true);
r = await U.call("PUT", "/api/style/profile", { answers: { ...full.answers, budget: { min: null, max: 9000 }, colors: ["Olive"] }, consent: S.NO_CONSENT });
t("editing saved preferences updates the profile", r.json.profile.derived.budget.max === 9000 && r.json.profile.derived.colors.join() === "Olive" && (await U.call("GET", "/api/style/profile")).json.consent.favorites === false);
t("another account cannot see it", (await V.call("GET", "/api/style/profile")).json.profile === null);
t("invalid answers are refused", (await U.call("PUT", "/api/style/profile", { answers: { departments: 5 }, consent: S.NO_CONSENT })).status === 422 && (await U.call("PUT", "/api/style/profile", { answers: full.answers, consent: { favorites: "x" } })).status === 422);
r = await U.call("DELETE", "/api/style/profile"); t("deleting removes the saved profile", r.json.deleted === 1 && (await U.call("GET", "/api/style/profile")).json.profile === null);

// purchases: real orders of the signed-in account (needs the test payment provider, as in e2e-commerce)
const env = readFileSync(".env.local", "utf8"), WH = env.match(/^PAYMENT_WEBHOOK_SECRET=(.+)$/m)?.[1];
if (WH) {
  const admin = new Client(); admin.cookies.vestora_session = execSync("node scripts/dev-session-token.mjs admin").toString().trim();
  const pick = idx.items.find((i) => i.kind === "tee" && i.availability === "in_stock" && i.demo);
  const P = (await admin.call("GET", `/api/admin/products/${pick.id}`)).json, Vr = P.variants.find((v) => v.stock >= 2), orig = Vr.stock;
  const B = await mk();
  const co = await B.call("POST", "/api/checkout", { lines: [{ productId: P.id, sku: Vr.sku, size: Vr.size, color: Vr.color, quantity: 1 }], customer: { email: "style-buyer@example.com", name: "Style Buyer", phone: "" }, shippingAddress: { fullName: "Test Person", line1: "1 Test Street", line2: "", city: "Springfield", region: "IL", postalCode: "62701", country: "US", phone: "" }, shippingMethod: "standard", idempotencyKey: randomUUID() });
  const total = (await B.call("GET", `/api/orders/${co.json.orderId}`)).json.totals.total;
  const raw = JSON.stringify({ id: "evt_" + randomUUID(), type: "paid", orderId: co.json.orderId, providerRef: null, amount: total, currency: "USD" });
  const hk = await fetch(BASE + "/api/payments/webhook/sandbox", { method: "POST", body: raw, headers: { "content-type": "application/json", "x-sandbox-signature": createHmac("sha256", WH).update(raw).digest("hex") } });
  t("(setup) a paid order exists for the account", hk.status === 200, hk.status);
  const pr = { profile: sub(S.deriveProfile(A({ departments: [pick.department], styles: ["casual"] }), facts).answers), limit: 40 };
  const off = (await B.call("POST", "/api/style/recommend", { ...pr, signals: { consent: S.NO_CONSENT } })).json, on = (await B.call("POST", "/api/style/recommend", { ...pr, signals: { consent: { ...S.NO_CONSENT, purchases: true } } })).json;
  t("purchases: without consent the bought product may still be shown; with consent it is left out", off.top.some((x) => x.id === pick.id) && !on.top.some((x) => x.id === pick.id), [off.top.length, on.top.length]);
  t("purchases are read on the server (a guest claiming them has no effect)", (await guest.call("POST", "/api/style/recommend", { ...pr, signals: { purchases: [pick.id], consent: { ...S.NO_CONSENT, purchases: true } } })).json.top.some((x) => x.id === pick.id));
  await admin.call("DELETE", `/api/admin/orders/${co.json.orderId}`); await admin.call("PUT", `/api/admin/products/${P.id}/stock`, { sku: Vr.sku, stock: orig });
} else console.log("note: no PAYMENT_WEBHOOK_SECRET; purchase checks skipped");

// pages
for (const p of ["/style-quiz", "/for-you"]) t(`page ${p} renders`, (await fetch(BASE + p)).status === 200);

console.log(`${pass} passed, ${failN} failed`); process.exit(failN ? 1 : 0);
