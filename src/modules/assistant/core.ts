// Stylist assistant logic: understanding a request, conversation state, follow-up questions, outfit building, budget fitting,
// explanations and validation of model-produced references. Pure rules over catalog records (no network, no AI model).
// Runs on the server, in the browser and in node tests. Every product shown comes from the catalog by id.
import { OCCASION_LABEL, OCCASIONS, SLOTS, colorsInStock, covers, hexFor, isNeutralHex, place, rateWorn, scoreCandidate, type Occasion, type Picks, type Slot } from "../outfit/core.ts";
import { KIND_NOUN, SEASONS, STYLES, STYLE_INFO, deriveProfile, emptyAnswers, neutralPalette, passes, scoreItem, noSignals, type Answers, type Facts, type Names, type Season, type Signals, type StyleId, type StyleItem, type StyleProfile } from "../style/core.ts";

// ======================= types =======================
export type Intent = "outfit" | "match" | "search" | "department" | "help" | "reset" | "unknown";
export type Ask = { slot: "occasion" | "budget" | "anchor"; question: string };
export type Budget = { amount: number; scope: "total" | "item" };
export type AState = {
  occasion: Occasion | null; label: string | null; formality: number | null; season: Season | null; style: StyleId | null; budget: Budget | null;
  anchorId: string | null; department: string | null; audience: "all" | "men" | "women"; colors: string[]; avoid: string[]; kinds: string[];
  pending: Ask["slot"] | null; lastIntent: Intent | null; lastTotal: number | null; round: number; shown: string[];
};
export const emptyState = (): AState => ({ occasion: null, label: null, formality: null, season: null, style: null, budget: null, anchorId: null, department: null, audience: "all", colors: [], avoid: [], kinds: [], pending: null, lastIntent: null, lastTotal: null, round: 0, shown: [] });

export type Chip = { label: string; text: string };
/** A product as shown in chat. Everything here is read from the catalog record, never from a model. */
export type AItem = {
  id: string; slug: string; name: string; brandName: string; categoryName: string; department: string; kind: string; slot: Slot; image: string | null;
  price: { amount: number; currency: string } | null; compareAt: { amount: number; currency: string } | null; demo: boolean;
  source: { kind: "official" | "affiliate-feed" | "manual-verified" | "demo"; retailer: string | null; url: string | null };
  bagStyle: "backpack" | "shoulder"; color: string | null; colors: { name: string; hex: string }[]; sizes: string[];
  /** In-stock combinations only: "Color|Size" (or "Color|" / "|Size" when a product has one of them) → SKU. */
  skus: Record<string, string>; why: string | null;
};
export type OutfitCard = {
  id: string; title: string; occasion: string | null; items: AItem[]; total: { currency: string; amount: number }; colors: string[]; colorStory: string;
  explanation: string; match: number; picks: Picks; budget: { limit: number; within: boolean } | null;
};
export type DeptRef = { slug: string; name: string; tagline: string; available: number; why: string; products: AItem[] };
export type Answer = {
  intent: Intent; message: string; ask: Ask | null; chips: Chip[]; outfits: OutfitCard[]; products: AItem[]; departments: DeptRef[]; state: AState;
  understood: string[]; usedProfile: boolean; shortfall: { limit: number; min: number | null } | null;
};
export type Ctx = {
  facts: Facts; names: Names; profile: StyleProfile | null; signals: Signals; cartIds: string[]; currentProductId: string | null; currentDepartment: string | null;
};

// ======================= understanding =======================
const KIND_WORDS: [string, RegExp][] = [
  ["tee", /\b(t-?shirts?|tees?)\b/], ["shirt", /\b(shirts?|blouses?|button-?ups?)\b/], ["hoodie", /\b(hoodies?|sweatshirts?)\b/], ["jacket", /\b(jackets?|bombers?|blazers?)\b/], ["coat", /\b(coats?|parkas?|overcoats?)\b/],
  ["suit", /\bsuits?\b/], ["trousers", /\b(trousers?|pants|jeans|chinos|joggers)\b/], ["dress", /\b(dress(es)?|gowns?)\b/], ["sneaker", /\b(sneakers?|shoes?|trainers?|footwear|boots?|loafers?)\b/],
  ["bag", /\b(bags?|backpacks?|handbags?|totes?|rucksacks?)\b/], ["watch", /\bwatch(es)?\b/], ["glasses", /\b(glasses|sunglasses|eyewear|shades)\b/],
];
const SLOT_OF_KIND: Record<string, Slot> = { tee: "base", shirt: "base", hoodie: "mid", jacket: "outer", coat: "outer", suit: "outer", trousers: "bottom", dress: "dress", sneaker: "shoes", bag: "bag", watch: "watch", glasses: "glasses" };
const OCCASION_RULES: { re: RegExp; occasion: Occasion; label: string; formality: number; style?: StyleId }[] = [
  { re: /\bbirthday\b/, occasion: "evening", label: "a birthday party", formality: 4 },
  { re: /\b(wedding|gala|black tie|ceremony|prom|formal event|formal occasion|graduation)\b/, occasion: "evening", label: "a formal event", formality: 5, style: "elegant" },
  { re: /\b(party|club|night out|date night|date|celebrat\w*|cocktail|dinner)\b/, occasion: "evening", label: "a night out", formality: 4 },
  { re: /\b(interview|office|business|meeting|professional|work)\b/, occasion: "work", label: "work", formality: 4, style: "classic" },
  { re: /\b(university|college|campus|lecture|class(es)?|school|study)\b/, occasion: "everyday", label: "a casual university day", formality: 2, style: "casual" },
  { re: /\b(gym|workout|training|running|jog\w*|sport\w*|exercise)\b/, occasion: "sport", label: "sport", formality: 1, style: "sporty" },
  { re: /\b(travel|trip|vacation|holiday|airport)\b/, occasion: "weekend", label: "travel", formality: 2 },
  { re: /\b(weekend|brunch|everyday|day out|hang ?out|friends|casual)\b/, occasion: "weekend", label: "a casual weekend", formality: 2, style: "casual" },
];
const SEASON_RULES: [Season, RegExp][] = [["summer", /\b(summer|hot|warm|beach|heat|sunny)\b/], ["winter", /\b(winter|cold|snow\w*|freezing|chilly)\b/], ["spring", /\b(spring|mild)\b/], ["autumn", /\b(autumn|fall|rainy)\b/]];
const STYLE_RULES: [StyleId, RegExp][] = [["minimalist", /\b(minimali\w*|minimal|clean look|simple)\b/], ["streetwear", /\b(street\w*|urban)\b/], ["sporty", /\b(sporty|athletic|athleisure)\b/], ["classic", /\b(classic|timeless|traditional)\b/], ["elegant", /\b(elegant|chic|sophisticated|refined)\b/], ["casual", /\b(relaxed|laid-?back|easy-?going)\b/]];

export const money = (n: number, currency = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: n % 100 === 0 ? 0 : 2 }).format(n / 100);

/** A budget in the text, in minor units. "under $200", "budget of 150", "$300 max", "within 250 dollars". */
export function parseBudget(lc: string): number | null {
  const pats = [/(?:under|below|less than|within|up to|upto|max(?:imum)?(?: of)?|at most|no more than|budget(?: of| is| around| about)?|around|about|for)\s*(?:us)?\$?\s*(\d[\d,]*(?:\.\d+)?)\b/, /\$\s*(\d[\d,]*(?:\.\d+)?)/, /\b(\d[\d,]*(?:\.\d+)?)\s*(?:dollars|usd|bucks)\b/];
  for (const re of pats) { const m = re.exec(lc); if (m) { const v = Number(m[1]!.replace(/,/g, "")); if (v >= 10 && v <= 100000) return Math.round(v * 100); } }
  return null;
}
const list = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const lower = (x: string) => x.toLowerCase();
const article = (noun: string) => (/^(pair|hoodie)/.test(noun) ? `a ${noun}` : /^[aeiou]/.test(noun) ? `an ${noun}` : `a ${noun}`);

export type Parsed = { intent: Intent; patch: Partial<AState>; matchSlot: Slot | null; searchKinds: string[]; department: string | null; flags: { another: boolean; cheaper: boolean; dressier: boolean; casual: boolean; addSlots: Slot[]; fromCart: boolean; reset: boolean }; understood: string[] };

/** Read one message in the light of the conversation so far. Deterministic. */
export function parse(text: string, st: AState, ctx: { facts: Facts; products: { id: string; name: string }[]; currentProductId: string | null; currentDepartment: string | null }): Parsed {
  const lc = ` ${text.toLowerCase().replace(/[’']/g, "'")} `.replace(/\s+/g, " ");
  const patch: Partial<AState> = {}; const understood: string[] = [];
  const flags = { another: false, cheaper: false, dressier: false, casual: false, addSlots: [] as Slot[], fromCart: false, reset: false };
  if (/^\s*(clear|reset|start over|new (chat|conversation))\b/.test(lc)) { flags.reset = true; return { intent: "reset", patch, matchSlot: null, searchKinds: [], department: null, flags, understood }; }

  let occ = OCCASION_RULES.find((r) => r.re.test(lc));
  if (/\bformal\b|\bsmart\b|\bdressy\b|\bdress up\b/.test(lc) && !/\binformal\b/.test(lc) && (!occ || occ.formality < 5)) occ = occ ?? { re: /x/, occasion: "evening", label: "a formal event", formality: 5, style: "elegant" };
  if (occ) { patch.occasion = occ.occasion; patch.label = occ.label; patch.formality = occ.formality; if (occ.style) patch.style = occ.style; understood.push(occ.label); }
  const season = SEASON_RULES.find(([, re]) => re.test(lc))?.[0]; if (season) { patch.season = season; understood.push(season); }
  const style = STYLE_RULES.find(([, re]) => re.test(lc))?.[0]; if (style) { patch.style = style; understood.push(STYLE_INFO[style].label.toLowerCase()); }
  // budget
  let amount = parseBudget(lc);
  if (amount === null && st.pending === "budget") { const m = /^\s*\$?\s*(\d[\d,]*)\s*(?:dollars|usd)?\s*$/.exec(lc); if (m) amount = Math.round(Number(m[1]!.replace(/,/g, "")) * 100); }
  if (amount !== null) { patch.budget = { amount, scope: /\b(per item|each|an item|one item)\b/.test(lc) ? "item" : "total" }; understood.push(`${patch.budget.scope === "item" ? "up to " : "under "}${money(amount, ctx.facts.currency)}${patch.budget.scope === "item" ? " per item" : ""}`); }
  const wantsBudget = /\b(my budget|within budget|on a budget|cheap|affordable|budget friendly|budget-friendly)\b/.test(lc) && amount === null;
  // explicit colors and audience (only what the shopper says)
  const colorHits = ctx.facts.colors.filter((c) => new RegExp(`\\b${c.name.toLowerCase()}\\b`).test(lc));
  const avoid = colorHits.filter((c) => new RegExp(`(?:no|not|without|avoid|except|hate)\\s+(?:any\\s+)?${c.name.toLowerCase()}\\b`).test(lc)).map((c) => c.name);
  const like = colorHits.map((c) => c.name).filter((n) => !avoid.includes(n));
  if (like.length) { patch.colors = like; understood.push(list(like)); }
  if (avoid.length) { patch.avoid = avoid; understood.push(`no ${list(avoid)}`); }
  if (/\b(men'?s|for (?:a )?(?:man|guy|him)|male)\b/.test(lc)) { patch.audience = "men"; understood.push("men’s section"); }
  else if (/\b(women'?s|for (?:a )?(?:woman|girl|her)|female)\b/.test(lc)) { patch.audience = "women"; understood.push("women’s section"); }
  // kinds
  let rest = lc; const found: { k: string; at: number }[] = [];
  for (const [k, re] of KIND_WORDS) { const m = re.exec(rest); if (m) { found.push({ k, at: m.index }); rest = rest.replace(re, " ".repeat(m[0].length)); } }
  const kinds = found.sort((a, b) => a.at - b.at).map((f) => f.k);
  // department mention
  const deptHit = ctx.facts.departments.find((d) => new RegExp(`\\b${d.name.toLowerCase().replace(/[^a-z ]/g, "")}\\b|\\b${d.slug.replace(/-/g, " ")}\\b`).test(lc));
  const navVerb = /\b(where|take me|show me the|navigate|walk me|go to|find the|located|location|which (?:department|section|room)|explore)\b/.test(lc) && /\b(department|section|room|area|store|mall|floor|map)\b|where is|where's|take me|walk me|navigate/.test(lc);
  const thisDept = /\b(this|the current) (department|section|room|area)\b/.test(lc);
  // products by name
  const named = [...ctx.products].filter((p) => p.name.length >= 6 && lc.includes(p.name.toLowerCase())).sort((a, b) => b.name.length - a.name.length)[0];
  const thisProduct = /\b(this|that|these|the same|it)\b/.test(lc) && !!ctx.currentProductId;
  const fromCart = /\b(my cart|in my cart|what i'?m buying|cart items?)\b/.test(lc); flags.fromCart = fromCart;
  if (named) patch.anchorId = named.id; else if (thisProduct && /\b(this|that) (jacket|coat|shirt|tee|hoodie|dress|trousers|pants|jeans|sneakers|shoes|suit|bag|watch|glasses|piece|item|product|one)\b|\bmatch(es|ing)?\b|\bgoes? with\b|\bpair\b/.test(lc)) patch.anchorId = ctx.currentProductId!;
  const anchor = patch.anchorId ?? null;
  if (patch.anchorId) understood.push("around the product you chose");
  flags.another = /\b(another|different|other options?|more options?|alternatives?|something else|again|not (?:that|these|those)|show more|new ones?)\b/.test(lc);
  flags.cheaper = /\b(cheaper|less expensive|lower price|lower budget|more affordable|save money)\b/.test(lc);
  flags.dressier = /\b(dressier|more formal|smarter|fancier|dress it up|more elegant)\b/.test(lc);
  flags.casual = /\b(more casual|more relaxed|less formal|dress it down|more comfortable)\b/.test(lc);
  for (const m of lc.matchAll(/\badd (?:a |an |some )?(jacket|coat|hoodie|bag|watch|glasses|sunglasses|shoes|sneakers|dress|shirt|tee)s?\b/g)) { const k = KIND_WORDS.find(([, re]) => re.test(m[1]!))?.[0]; if (k) flags.addSlots.push(SLOT_OF_KIND[k]!); }
  if (flags.dressier) { patch.formality = Math.min(5, (st.formality ?? 3) + 1); understood.push("dressier"); }
  if (flags.casual) { patch.formality = Math.max(1, (st.formality ?? 3) - 1); understood.push("more casual"); }

  const outfitWords = /\b(outfit|outfits|look|looks|wear|what should i|dress me|style me|put together|ensemble|something for|clothes|suggest|recommend|help me (?:build|find|choose|pick))\b/.test(lc);
  const slotAsked = ((): Slot | null => { const k = kinds[0]; return k ? SLOT_OF_KIND[k]! : null; })();
  const matchWords = /\b(match|matching|matches|goes? with|go with|pair|pairs|complement|to wear with|that fits? with)\b/.test(lc);
  let intent: Intent = "unknown";
  if (/^\s*(hi|hello|hey|good (morning|afternoon|evening))\b/.test(lc) || /\b(what can you do|how do(es)? this work|who are you|help)\s*[?!.]*\s*$/.test(lc)) intent = "help";
  else if ((navVerb || thisDept) && (deptHit || thisDept || /where/.test(lc))) intent = "department";
  else if (deptHit && /\b(department|section|room)\b/.test(lc)) intent = "department";
  else if (slotAsked && matchWords && (anchor || st.anchorId || fromCart || /\b(this|my)\b/.test(lc))) intent = "match";
  else if (fromCart) intent = "outfit";
  else if (outfitWords || occ || season || style || /\bformal\b/.test(lc) || (anchor && !slotAsked)) intent = "outfit";
  else if (kinds.length > 0 && /\b(show|find|looking for|do you have|any|i want|i need|get me|recommend|suggest|search|under|got)\b/.test(lc)) intent = "search";
  else if (flags.another || flags.cheaper || flags.dressier || flags.casual || flags.addSlots.length || amount !== null || like.length || avoid.length) intent = st.lastIntent === "search" ? "search" : st.lastIntent === "match" ? "match" : "outfit";
  else if (st.pending === "occasion" && text.trim().length > 1) intent = "outfit";
  else if (wantsBudget) intent = "outfit";
  if (intent === "outfit" && kinds.length > 0 && !outfitWords && !occ && !season && !style && !flags.another && !flags.addSlots.length && !flags.cheaper && !flags.dressier && !flags.casual) intent = "search";
  if (intent === "department" && deptHit) patch.department = deptHit.slug;
  if (intent === "department" && !deptHit && ctx.currentDepartment) patch.department = ctx.currentDepartment;
  void wantsBudget;
  return { intent, patch, matchSlot: intent === "match" ? slotAsked : null, searchKinds: intent === "search" ? kinds : [], department: (patch.department as string | undefined) ?? deptHit?.slug ?? null, flags, understood };
}
export const asksForBudget = (text: string) => /\b(my budget|within budget|on a budget|budget friendly|budget-friendly|affordable|cheap)\b/.test(` ${text.toLowerCase()} `) && parseBudget(text.toLowerCase()) === null;

/** Apply what was understood to the conversation state. A new request about a different topic starts fresh; refinements keep the rest. */
export function mergeState(st: AState, p: Parsed, text: string): AState {
  const topicChange = p.intent === "outfit" && !!(p.patch.occasion || p.patch.season || p.patch.style) && !p.flags.another && !p.flags.cheaper && !p.flags.dressier && !p.flags.casual;
  const base: AState = topicChange ? { ...emptyState(), audience: st.audience, budget: st.budget, avoid: st.avoid, colors: [], shown: [], round: 0 } : { ...st };
  const next: AState = { ...base, ...p.patch } as AState;
  if (p.patch.colors) next.colors = p.patch.colors; if (p.patch.avoid) next.avoid = [...new Set([...base.avoid, ...p.patch.avoid])];
  if (p.intent === "reset") return emptyState();
  if (p.flags.another) next.round = st.round + 1;
  if (p.flags.cheaper && st.lastTotal) next.budget = { amount: Math.max(2000, Math.round(st.lastTotal * 0.8)), scope: "total" };
  if (p.intent === "match" && !next.anchorId) next.pending = "anchor";
  next.lastIntent = p.intent === "unknown" || p.intent === "help" ? st.lastIntent : p.intent;
  if (p.intent === "search") next.kinds = p.searchKinds;
  void text;
  return next;
}

// ======================= recipes =======================
type Part = { label: string; slots: Slot[]; kinds?: string[]; optional?: boolean };
type Recipe = { id: string; title: string; parts: Part[]; note: string };
const P = (label: string, slots: Slot[], kinds?: string[], optional = false): Part => ({ label, slots, kinds, optional });
const TOP = P("top", ["base"], ["tee", "shirt"]), SHIRT = P("shirt", ["base"], ["shirt"]), TEE = P("tee", ["base"], ["tee"]), PANTS = P("bottoms", ["bottom"], ["trousers"]);
const SHOES = P("shoes", ["shoes"], ["sneaker"]), BAG = P("bag", ["bag"], ["bag"], true), WATCH = P("watch", ["watch"], ["watch"], true), GLASSES = P("eyewear", ["glasses"], ["glasses"], true);
const JACKET = P("jacket", ["outer"], ["jacket"]), COAT = P("coat", ["outer"], ["coat"]), OUTER = P("outerwear", ["outer"], ["jacket", "coat"]), OUTER_OPT = P("outerwear", ["outer"], ["jacket", "coat"], true);
const HOODIE = P("hoodie", ["mid"], ["hoodie"]), HOODIE_OPT = P("hoodie", ["mid"], ["hoodie"], true), SUIT = P("suit", ["outer"], ["suit"]), DRESS = P("dress", ["dress"], ["dress"]);

export type Mode = "formal" | "party" | "work" | "university" | "sport" | "winter" | "summer" | "mild" | "minimalist" | "casual";
export function modeOf(s: AState): Mode {
  if ((s.formality ?? 0) >= 5) return "formal";
  if (s.occasion === "evening") return "party";
  if (s.occasion === "work") return "work";
  if (s.label === "a casual university day") return "university";
  if (s.occasion === "sport") return "sport";
  if (s.season === "winter") return "winter";
  if (s.season === "summer") return "summer";
  if (s.season === "spring" || s.season === "autumn") return "mild";
  if (s.style === "minimalist") return "minimalist";
  return "casual";
}
const RECIPES: Record<Mode, Recipe[]> = {
  formal: [
    { id: "tailored-suit", title: "The tailored suit", parts: [SUIT, SHIRT, SHOES, WATCH], note: "A suit with a shirt underneath is the safest formal choice; keep shoes and accessories simple." },
    { id: "shirt-trousers-jacket", title: "Shirt, trousers and jacket", parts: [SHIRT, PANTS, OUTER, SHOES, WATCH], note: "Separates read as formal when the jacket and trousers are in calm, solid colors." },
    { id: "evening-dress", title: "The evening dress", parts: [DRESS, OUTER_OPT, SHOES, BAG], note: "A dress needs little else: add a coat or jacket if it is cool." },
  ],
  party: [
    { id: "party-dress", title: "The party dress", parts: [DRESS, SHOES, BAG, OUTER_OPT], note: "A dress with simple shoes lets the dress be the focus." },
    { id: "smart-shirt", title: "Smart shirt and jacket", parts: [SHIRT, PANTS, JACKET, SHOES], note: "A shirt under a jacket is dressier than a tee but still relaxed." },
    { id: "relaxed-party", title: "Relaxed party look", parts: [TEE, PANTS, JACKET, SHOES, WATCH], note: "A tee with a jacket keeps it easy while still looking put together." },
  ],
  work: [
    { id: "shirt-trousers", title: "Shirt, trousers and jacket", parts: [SHIRT, PANTS, JACKET, SHOES, WATCH], note: "A shirt, trousers and a jacket is a dependable work uniform." },
    { id: "work-suit", title: "The suit", parts: [SUIT, SHIRT, SHOES], note: "A suit and shirt for a more formal workplace." },
    { id: "work-dress", title: "Dress and jacket", parts: [DRESS, JACKET, SHOES, BAG], note: "A dress with a jacket on top is quick to put on and smart." },
  ],
  university: [
    { id: "campus-tee", title: "Campus basics", parts: [TEE, PANTS, HOODIE_OPT, SHOES, BAG], note: "Layers you can add or remove across a long day, with a bag for your things." },
    { id: "campus-shirt", title: "Easy shirt look", parts: [SHIRT, PANTS, OUTER_OPT, SHOES, BAG], note: "A shirt with relaxed trousers looks sharper than a tee without being dressy." },
    { id: "campus-hoodie", title: "Hoodie day", parts: [HOODIE, PANTS, SHOES, BAG], note: "A hoodie, pants and sneakers: comfortable for lectures and walking." },
  ],
  sport: [
    { id: "train-tee", title: "Training set", parts: [TEE, PANTS, SHOES, BAG], note: "A tee, pants and sneakers for training." },
    { id: "train-hoodie", title: "Warm-up layers", parts: [HOODIE, PANTS, SHOES], note: "A hoodie for warming up and cooling down." },
  ],
  winter: [
    { id: "winter-coat", title: "Coat and knit layers", parts: [SHIRT, PANTS, COAT, SHOES], note: "A coat over a shirt and trousers is the simplest winter outfit." },
    { id: "winter-layers", title: "Layered winter look", parts: [TEE, HOODIE, PANTS, OUTER, SHOES], note: "Tee, hoodie and jacket: three thin layers keep you warm and can be removed indoors." },
    { id: "winter-dress", title: "Dress under a coat", parts: [DRESS, COAT, SHOES, BAG], note: "A dress with a coat over it works in the cold." },
  ],
  summer: [
    { id: "summer-tee", title: "Light tee look", parts: [TEE, PANTS, SHOES, GLASSES], note: "A tee, light pants and sneakers keep things cool." },
    { id: "summer-dress", title: "Summer dress", parts: [DRESS, SHOES, GLASSES, BAG], note: "A dress is the easiest hot-weather outfit." },
    { id: "summer-shirt", title: "Open shirt look", parts: [SHIRT, PANTS, SHOES, WATCH], note: "A shirt is cooler than a hoodie and dresses up easily." },
  ],
  mild: [
    { id: "mild-jacket", title: "Tee and jacket", parts: [TEE, PANTS, JACKET, SHOES], note: "A light jacket over a tee covers changeable weather." },
    { id: "mild-shirt", title: "Shirt and jacket", parts: [SHIRT, PANTS, OUTER, SHOES, WATCH], note: "A shirt with a jacket handles cool mornings and warm afternoons." },
    { id: "mild-hoodie", title: "Hoodie layer", parts: [TEE, HOODIE, PANTS, SHOES], note: "A hoodie over a tee is easy to take off." },
  ],
  minimalist: [
    { id: "min-tee", title: "Minimal essentials", parts: [TEE, PANTS, OUTER, SHOES], note: "Few pieces in calm colors: the look comes from clean lines." },
    { id: "min-shirt", title: "Quiet shirt look", parts: [SHIRT, PANTS, SHOES, WATCH], note: "A plain shirt with simple trousers and one accessory." },
    { id: "min-dress", title: "One-piece minimal", parts: [DRESS, OUTER_OPT, SHOES], note: "A single dress needs nothing else." },
  ],
  casual: [
    { id: "casual-tee", title: "Easy everyday", parts: [TEE, PANTS, HOODIE_OPT, SHOES, BAG], note: "A tee and pants with sneakers, plus a hoodie if it is cool." },
    { id: "casual-shirt", title: "Relaxed shirt look", parts: [SHIRT, PANTS, OUTER_OPT, SHOES, BAG], note: "A shirt with relaxed trousers is comfortable and tidy." },
    { id: "casual-hoodie", title: "Hoodie and sneakers", parts: [HOODIE, PANTS, SHOES, BAG], note: "A hoodie, pants and sneakers for a lazy day." },
  ],
};
export const recipesFor = (s: AState): Recipe[] => RECIPES[modeOf(s)];

// ======================= items =======================
const ORDER: Slot[] = ["dress", "base", "mid", "outer", "bottom", "shoes", "bag", "watch", "glasses"];
export function toAItem(i: StyleItem, color: string | null, why: string | null = null): AItem {
  const stock = colorsInStock(i), skus: Record<string, string> = {};
  for (const v of i.variants) if (v.stock > 0) skus[`${v.color ?? ""}|${v.size ?? ""}`] = v.sku;
  const sizes = [...new Set(i.variants.filter((v) => v.stock > 0 && v.size && (!color || !v.color || v.color === color)).map((v) => v.size!))];
  return {
    id: i.id, slug: i.slug, name: i.name, brandName: i.brandName, categoryName: i.categoryName, department: i.department, kind: i.kind, slot: i.slot!, image: i.image, price: i.price, compareAt: i.compareAt, demo: i.demo,
    source: { kind: i.sourceKind, retailer: i.retailer, url: i.sourceUrl }, bagStyle: i.bagStyle, color: color ?? stock[0]?.name ?? null,
    colors: stock.map((c) => ({ name: c.name, hex: hexFor(i, c.name) })), sizes, skus, why,
  };
}

// ======================= request → profile =======================
export function requestProfile(st: AState, ctx: Ctx): StyleProfile {
  const saved = ctx.profile?.answers ?? emptyAnswers();
  const a: Answers = { ...saved };
  const style = st.style ?? undefined;
  a.styles = style ? [style] : saved.styles.length ? saved.styles : ((): StyleId[] => { const m = modeOf(st); return m === "formal" || m === "work" ? ["classic"] : m === "party" ? ["elegant"] : m === "sport" ? ["sporty"] : m === "minimalist" ? ["minimalist"] : ["casual"]; })();
  if (st.formality !== null) a.formality = st.formality;
  if (st.occasion) a.occasions = [st.occasion];
  if (st.season) a.seasons = [st.season];
  if (st.colors.length) a.colors = st.colors;
  if (st.avoid.length) a.avoidColors = [...new Set([...a.avoidColors.filter((c) => !st.colors.includes(c)), ...st.avoid])].filter((c) => !a.colors.includes(c));
  if (st.audience !== "all") a.audience = st.audience;
  a.budget = st.budget?.scope === "item" ? { min: null, max: st.budget.amount } : saved.budget ?? null;
  if (st.department) a.departments = [st.department];
  if (a.departments.length === 0) a.departments = [];
  return deriveProfile(a, ctx.facts, 0);
}

// ======================= outfit generation =======================
type Gen = { items: readonly StyleItem[]; byId: Map<string, StyleItem>; profile: StyleProfile; st: AState; ctx: Ctx; used: Set<string>; avoidIds: Set<string> };
const priceOf = (i: StyleItem) => i.price?.amount ?? Infinity;
const resolveIn = (g: Gen) => (id: string) => g.byId.get(id) as never;

function candidates(g: Gen, part: Part, picks: Picks, mode: Mode, strict: boolean): { item: StyleItem; value: number; color: string | null }[] {
  const out: { item: StyleItem; value: number; color: string | null }[] = [];
  const resolve = resolveIn(g);
  for (const it of g.items) {
    if (!it.slot || !part.slots.includes(it.slot) || (part.kinds && !part.kinds.includes(it.kind))) continue;
    if (mode === "summer" && ["coat", "hoodie"].includes(it.kind)) continue;
    if (mode === "sport" && it.kind === "suit") continue;
    if (!passes(it, g.profile, noSignals()) || it.price?.currency !== g.ctx.facts.currency) continue;
    if (strict && g.avoidIds.has(it.id)) continue;
    const sc = scoreCandidate(it, picks, resolve, { occasion: g.st.occasion, audience: g.st.audience }); if (!sc) continue;
    const prof = scoreItem(it, g.profile, g.ctx.signals, g.ctx.names).score;
    let color = sc.color;
    if (g.st.colors.length) { const liked = colorsInStock(it).find((c) => g.st.colors.includes(c.name)); if (liked) color = liked.name; }
    if (color && g.profile.derived.avoidColors.includes(color)) color = colorsInStock(it).find((c) => !g.profile.derived.avoidColors.includes(c.name))?.name ?? color;
    let value = 0.5 * sc.score + 0.5 * prof + (g.st.colors.length && color && g.st.colors.includes(color) ? 0.08 : 0);
    if (g.st.style === "minimalist" && neutralPalette(it)) value += 0.08;
    if (g.used.has(it.id)) value -= 0.15;
    if (it.kind === "bag" && g.st.label === "a casual university day" && it.bagStyle === "backpack") value += 0.1;
    out.push({ item: it, value, color });
  }
  return out.sort((a, b) => b.value - a.value || (a.item.id < b.item.id ? -1 : 1));
}

type Built = { recipe: Recipe; picks: Picks; chosen: { part: Part; item: StyleItem; color: string | null }[]; total: number };
function build(g: Gen, recipe: Recipe, mode: Mode, anchor: StyleItem | null, extra: Slot[], strict: boolean): Built | null {
  let picks: Picks = {}; const chosen: Built["chosen"] = []; const resolve = resolveIn(g);
  if (anchor) { picks = place(picks, anchor as never, { productId: anchor.id, sku: null, size: null, color: colorsInStock(anchor)[0]?.name ?? null }, resolve).picks; chosen.push({ part: P("chosen piece", [anchor.slot!]), item: anchor, color: picks[anchor.slot!]?.color ?? null }); }
  const parts = [...recipe.parts];
  for (const s of extra) if (!parts.some((p) => p.slots.includes(s))) parts.push(P("added piece", [s], undefined, false));
  const need = [...parts].sort((a, b) => Number(!!a.optional) - Number(!!b.optional));
  for (const part of need) {
    const taken = SLOTS.some((s) => { const p = picks[s]; const it = p && g.byId.get(p.productId); return it?.slot && covers(it.kind, it.slot).some((c) => part.slots.includes(c as Slot)) && (anchor ? true : true); });
    if (taken && part.slots.some((s) => !!picks[s] || SLOTS.some((k) => { const p = picks[k]; const it = p && g.byId.get(p.productId); return !!it?.slot && covers(it.kind, it.slot).includes(s); }))) continue;
    let pool = candidates(g, part, picks, mode, strict);
    if (part.optional) { // an optional extra should not cost more than the outfit it completes
      if (mode === "summer" && part.slots.includes("outer")) continue;
      const running = chosen.reduce((n, x) => n + priceOf(x.item), 0);
      pool = pool.filter((x) => priceOf(x.item) <= Math.max(0.8 * running, 5000));
    }
    const c = pool[0];
    if (!c) { if (part.optional) continue; return null; }
    picks = place(picks, c.item as never, { productId: c.item.id, sku: null, size: null, color: c.color }, resolve).picks;
    chosen.push({ part, item: c.item, color: c.color });
  }
  const live = chosen.filter((c) => Object.values(picks).some((p) => p.productId === c.item.id));
  return { recipe, picks, chosen: live, total: live.reduce((n, c) => n + priceOf(c.item), 0) };
}

/** Bring an outfit under a total budget by swapping the dearest pieces for cheaper compatible ones, then by dropping optional pieces. */
function fit(g: Gen, b: Built, limit: number, mode: Mode): Built | null {
  const resolve = resolveIn(g); let cur = b;
  for (let n = 0; n < 14 && cur.total > limit; n++) {
    const order = [...cur.chosen].filter((c) => c.part.label !== "chosen piece").sort((x, y) => priceOf(y.item) - priceOf(x.item));
    let swapped = false;
    for (const c of order) {
      const others: Picks = { ...cur.picks }; delete others[c.item.slot!];
      const alt = candidates(g, c.part, others, mode, true).filter((x) => x.item.id !== c.item.id && priceOf(x.item) < priceOf(c.item) * 0.9)[0];
      if (!alt) continue;
      const picks = place(others, alt.item as never, { productId: alt.item.id, sku: null, size: null, color: alt.color }, resolve).picks;
      const chosen = cur.chosen.map((x) => (x === c ? { part: c.part, item: alt.item, color: alt.color } : x));
      cur = { ...cur, picks, chosen, total: chosen.reduce((s, x) => s + priceOf(x.item), 0) }; swapped = true; break;
    }
    if (swapped) continue;
    const drop = [...cur.chosen].filter((c) => c.part.optional).sort((x, y) => priceOf(y.item) - priceOf(x.item))[0];
    if (!drop) return null;
    const picks = { ...cur.picks }; delete picks[drop.item.slot!];
    const chosen = cur.chosen.filter((x) => x !== drop); cur = { ...cur, picks, chosen, total: chosen.reduce((s, x) => s + priceOf(x.item), 0) };
  }
  return cur.total <= limit ? cur : null;
}
/** Cheapest total any recipe could reach for this request (to tell the shopper what budget would work). */
function cheapestTotal(g: Gen, recipes: Recipe[], mode: Mode): number | null {
  let best: number | null = null;
  for (const r of recipes) {
    let t = 0, ok = true;
    for (const part of r.parts.filter((p) => !p.optional)) { const c = candidates(g, part, {}, mode, false); if (!c.length) { ok = false; break; } t += Math.min(...c.map((x) => priceOf(x.item))); }
    if (ok && (best === null || t < best)) best = t;
  }
  return best;
}

function paletteStory(items: StyleItem[], colors: (string | null)[]): string {
  const hexes = items.map((i, k) => hexFor(i, colors[k] ?? null)), n = hexes.filter(isNeutralHex).length;
  const names = [...new Set(colors.filter((c): c is string => !!c))];
  const base = n === hexes.length ? "All neutral colors, so every piece goes with the others" : n >= Math.ceil(hexes.length / 2) ? "A neutral base with color accents" : "Several colors: keep one as the main color";
  return `${list(names)}. ${base}.`;
}
function describe(b: Built, st: AState, ctx: Ctx, g: Gen, limit: number | null): { explanation: string; colorStory: string; match: number } {
  const items = b.chosen.map((c) => c.item), colors = b.chosen.map((c) => c.color);
  const nouns = items.map((i) => KIND_NOUN[i.kind] ?? "piece").map(article), depts = [...new Set(items.map((i) => ctx.names.department(i.department)))];
  const story = paletteStory(items, colors), resolve = resolveIn(g);
  const rates = (Object.keys(b.picks) as Slot[]).map((s) => rateWorn(s, b.picks, resolve, { occasion: st.occasion })?.score ?? 0.7); const match = Math.round((rates.reduce((a, x) => a + x, 0) / Math.max(1, rates.length)) * 100);
  const parts = [`${st.label ? `For ${st.label}` : "A look"}${st.season ? ` in ${st.season}` : ""}: ${list(nouns)}, from our ${list(depts)} department${depts.length > 1 ? "s" : ""}.`, b.recipe.note, `Colors: ${story}`];
  if (limit) parts.push(`Total ${money(b.total, ctx.facts.currency)}, within your ${money(limit, ctx.facts.currency)} budget.`);
  parts.push("Every piece is in stock.");
  return { explanation: parts.join(" "), colorStory: story, match };
}
const toCard = (b: Built, st: AState, ctx: Ctx, g: Gen, limit: number | null): OutfitCard => {
  const d = describe(b, st, ctx, g, limit), ordered = [...b.chosen].sort((x, y) => ORDER.indexOf(x.item.slot!) - ORDER.indexOf(y.item.slot!));
  return { id: `${b.recipe.id}-${b.chosen.map((c) => c.item.id).join("+")}`, title: b.recipe.title, occasion: st.label, items: ordered.map((c) => toAItem(c.item, c.color)), total: { currency: ctx.facts.currency, amount: b.total }, colors: [...new Set(ordered.map((c) => c.color).filter((c): c is string => !!c))], colorStory: d.colorStory, explanation: d.explanation, match: d.match, picks: b.picks, budget: limit ? { limit, within: b.total <= limit } : null };
};

export type OutfitResult = { outfits: OutfitCard[]; shortfall: { limit: number; min: number | null } | null };
export function generateOutfits(items: readonly StyleItem[], st: AState, ctx: Ctx, opts: { want?: number; extra?: Slot[] } = {}): OutfitResult {
  const profile = requestProfile(st, ctx), byId = new Map(items.map((i) => [i.id, i]));
  const g: Gen = { items, byId, profile, st, ctx, used: new Set(), avoidIds: new Set(st.shown) };
  const mode = modeOf(st), limit = st.budget?.scope === "total" ? st.budget.amount : null, anchor = st.anchorId ? byId.get(st.anchorId) ?? null : null;
  let recipes = recipesFor(st);
  if (anchor) recipes = recipes.filter((r) => r.parts.some((p) => p.slots.some((s) => anchor.slot && covers(anchor.kind, anchor.slot).includes(s))) || true);
  const out: OutfitCard[] = []; const want = opts.want ?? 3;
  const extra = [...(opts.extra ?? [])]; if (mode === "winter" && !extra.includes("outer")) extra.push("outer");
  for (const strict of [true, false]) {
    for (const r of recipes) {
      if (out.length >= want) break;
      if (out.some((o) => o.id.startsWith(r.id))) continue;
      let b = build(g, r, mode, anchor, extra, strict); if (!b) continue;
      if (limit && b.total > limit) { const f = fit(g, b, limit, mode); if (!f) continue; b = f; }
      const ids = b.chosen.map((c) => c.item.id);
      if (out.some((o) => o.items.filter((i) => ids.includes(i.id)).length / Math.max(1, ids.length) > 0.6)) continue;
      ids.forEach((id) => g.used.add(id)); out.push(toCard(b, st, ctx, g, limit));
    }
    if (out.length >= Math.min(want, 2)) break;
  }
  const shortfall = !out.length && limit ? { limit, min: cheapestTotal(g, recipes, mode) } : null;
  return { outfits: out, shortfall };
}

/** Compatible replacements for one piece of an outfit, within what is left of the budget. */
export function alternativesFor(items: readonly StyleItem[], st: AState, ctx: Ctx, outfitIds: string[], slot: Slot, opts: { limit?: number; exclude?: string[] } = {}): AItem[] {
  const profile = requestProfile(st, ctx), byId = new Map(items.map((i) => [i.id, i])), g: Gen = { items, byId, profile, st, ctx, used: new Set(opts.exclude ?? []), avoidIds: new Set(opts.exclude ?? []) };
  const resolve = resolveIn(g); let picks: Picks = {};
  for (const id of outfitIds) { const it = byId.get(id); if (it?.slot && it.slot !== slot) picks = place(picks, it as never, { productId: id, sku: null, size: null, color: colorsInStock(it)[0]?.name ?? null }, resolve).picks; }
  const spent = outfitIds.reduce((n, id) => { const it = byId.get(id); return n + (it && it.slot !== slot ? priceOf(it) : 0); }, 0);
  const cur = outfitIds.map((id) => byId.get(id)).find((i) => i?.slot === slot);
  const kinds = cur ? [cur.kind] : undefined, mode = modeOf(st);
  const all = candidates(g, P("alt", [slot], kinds ? undefined : undefined), picks, mode, true).filter((c) => !outfitIds.includes(c.item.id) && (opts.limit ? spent + priceOf(c.item) <= opts.limit : true));
  return all.slice(0, 4).map((c) => toAItem(c.item, c.color, `${Math.round(c.value * 100)}% match with the rest of the outfit`));
}

/** Pieces that match one product (find shoes matching this jacket). */
export function matchesFor(items: readonly StyleItem[], st: AState, ctx: Ctx, anchor: StyleItem, slot: Slot, n = 4): AItem[] {
  const profile = requestProfile(st, ctx), byId = new Map(items.map((i) => [i.id, i])), g: Gen = { items, byId, profile, st, ctx, used: new Set(), avoidIds: new Set(st.shown) };
  const picks = place({}, anchor as never, { productId: anchor.id, sku: null, size: null, color: colorsInStock(anchor)[0]?.name ?? null }, resolveIn(g)).picks;
  let cs = candidates(g, P("match", [slot]), picks, modeOf(st), true);
  if (!cs.length) cs = candidates(g, P("match", [slot]), picks, modeOf(st), false);
  const limit = st.budget?.scope === "total" ? st.budget.amount - priceOf(anchor) : st.budget?.scope === "item" ? st.budget.amount : null;
  return cs.filter((c) => c.item.id !== anchor.id && (limit === null || priceOf(c.item) <= limit)).slice(0, n).map((c) => {
    const sc = scoreCandidate(c.item, picks, resolveIn(g), { occasion: st.occasion });
    return toAItem(c.item, c.color, sc && sc.reasons.length ? `${Math.round(sc.score * 100)}% match: ${sc.reasons[0]}` : `${Math.round(c.value * 100)}% match`);
  });
}

/** Search the catalog with the filters the shopper gave. */
export function searchProducts(items: readonly StyleItem[], st: AState, ctx: Ctx, kinds: string[], n = 6): AItem[] {
  const profile = requestProfile(st, ctx), g: Gen = { items, byId: new Map(items.map((i) => [i.id, i])), profile, st, ctx, used: new Set(), avoidIds: new Set() };
  const out: { item: StyleItem; v: number; color: string | null }[] = [];
  const lim = st.budget ? st.budget.amount : null;
  for (const it of items) {
    if (kinds.length && !kinds.includes(it.kind)) continue;
    if (!passes(it, profile, noSignals())) continue;
    if (lim !== null && priceOf(it) > lim) continue;
    if (st.colors.length && !colorsInStock(it).some((c) => st.colors.includes(c.name))) continue;
    if (st.season && !(profile.derived.seasons.length === 0)) { /* season ranks, it does not exclude */ }
    const sc = scoreItem(it, profile, ctx.signals, ctx.names);
    out.push({ item: it, v: sc.score, color: st.colors.length ? colorsInStock(it).find((c) => st.colors.includes(c.name))?.name ?? sc.color : sc.color });
  }
  void g;
  return out.sort((a, b) => b.v - a.v || (a.item.id < b.item.id ? -1 : 1)).slice(0, n).map((x) => toAItem(x.item, x.color, null));
}

// ======================= the whole reply (rules) =======================
const SCENARIOS: Chip[] = [
  { label: "Birthday party outfit", text: "I need an outfit for a birthday party" }, { label: "Casual university look", text: "Suggest a casual university outfit" },
  { label: "Formal event", text: "I need something for a formal event" }, { label: "Summer outfit", text: "Help me build a summer outfit" },
  { label: "Winter look", text: "Suggest a winter look" }, { label: "Minimalist outfit", text: "I want a minimalist outfit" }, { label: "Within my budget", text: "Build an outfit within my budget" },
];
export const SUGGESTED = SCENARIOS;
const OCCASION_CHIPS: Chip[] = [{ label: "Birthday party", text: "A birthday party" }, { label: "University", text: "A casual university day" }, { label: "Formal event", text: "A formal event" }, { label: "Work", text: "Work" }, { label: "Weekend", text: "A casual weekend" }, { label: "Summer", text: "For summer" }, { label: "Winter", text: "For winter" }];
const BUDGET_CHIPS: Chip[] = [100, 200, 300, 500].map((n) => ({ label: `Under $${n}`, text: `Under $${n}` }));

export function answer(items: readonly StyleItem[], text: string, state: AState, ctx: Ctx): Answer {
  const p = parse(text, state, { facts: ctx.facts, products: items.map((i) => ({ id: i.id, name: i.name })), currentProductId: ctx.currentProductId, currentDepartment: ctx.currentDepartment });
  let st = mergeState(state, p, text);
  const base = (over: Partial<Answer>): Answer => ({ intent: p.intent, message: "", ask: null, chips: [], outfits: [], products: [], departments: [], state: { ...st, pending: over.ask?.slot ?? null }, understood: p.understood, usedProfile: !!ctx.profile, shortfall: null, ...over });
  const byId = new Map(items.map((i) => [i.id, i]));
  const cur = (m: string) => money(1, ctx.facts.currency) && m;
  void cur;

  if (p.intent === "reset") return base({ message: "Okay, we can start fresh. What are you shopping for?", chips: SCENARIOS.slice(0, 5), state: emptyState() });
  if (p.intent === "help" || (p.intent === "unknown" && !state.pending)) {
    const first = p.intent === "help";
    return base({ intent: first ? "help" : "unknown", message: first ? "I’m your Vestora stylist. I can build complete outfits from what’s in stock, find pieces that match something you chose, search by type, color or budget, and show you where a department is in the mall. Try one of these, or ask in your own words." : "I didn’t catch that. I can build an outfit for an occasion, season or style, find shoes or other pieces to match a product, search the catalog, or show you a department. Try one of these:", chips: SCENARIOS });
  }
  if (p.intent === "department") {
    const slug = st.department ?? p.department; const d = slug ? ctx.facts.departments.find((x) => x.slug === slug) : undefined;
    if (!d) return base({ message: "Which department do you mean? Here are the ones in the mall:", chips: ctx.facts.departments.map((x) => ({ label: x.name, text: `Where is the ${x.name} department?` })) });
    return base({ departments: [deptRef(items, d.slug, d.name, st, ctx)], message: `Here is ${d.name}. I’ve shown where it is in the mall and a few pieces you might like from it.`, chips: [{ label: `Outfit from ${d.name}`, text: `Build me an outfit from the ${d.name} department` }, { label: "Another department", text: "Show me another department" }] });
  }
  const wanted = st.anchorId ? byId.get(st.anchorId) : undefined;
  if (wanted && !wanted.available && (p.intent === "outfit" || p.intent === "match")) return base({ message: `The ${wanted.name} is sold out right now, so I can’t build around it. Tell me the occasion or style and I’ll put together something from what’s in stock.`, chips: SCENARIOS.slice(0, 4), state: { ...st, anchorId: null, pending: null } });
  if (p.intent === "match") {
    const anchor = st.anchorId ? byId.get(st.anchorId) : p.flags.fromCart ? ctx.cartIds.map((id) => byId.get(id)).find((i) => i?.slot) : undefined;
    if (!anchor) {
      const pool = items.filter((i) => ["jacket", "coat"].includes(i.kind) && i.available).slice(0, 4).map((i) => toAItem(i, colorsInStock(i)[0]?.name ?? null));
      return base({ ask: { slot: "anchor", question: "Which product should I match? Pick one below, or open a product page and tap “Ask the stylist about this”." }, message: "Which product should I find a match for? Pick one below, or open a product page and tap “Ask the stylist about this”.", products: pool, chips: [] });
    }
    const slot = p.matchSlot ?? "shoes"; st = { ...st, anchorId: anchor.id };
    const ms = matchesFor(items, st, ctx, anchor, slot);
    const res = generateOutfits(items, { ...st, shown: [] }, ctx, { want: 2 });
    return base({ products: ms, outfits: res.outfits, state: { ...st, pending: null, shown: [...st.shown, ...ms.map((m) => m.id)].slice(-40) }, message: ms.length ? `Here are ${ms.length} ${(KIND_NOUN[SLOT_KIND[slot] ?? ""] ?? "piece").replace(/^pair of /, "")}${ms.length === 1 ? "" : "s"} that go with the ${anchor.name}, all in stock. Below are outfits built around it.` : `I couldn’t find an available match in that category for the ${anchor.name}${st.budget ? " within your budget" : ""}.`, chips: [{ label: "Show different matches", text: "Show me different options" }, { label: "Under $150", text: "Under $150" }], understood: [`matching the ${anchor.name}`, ...p.understood.filter((x) => x !== "around the product you chose")] });
  }
  if (p.intent === "search") {
    const kinds = p.searchKinds.length ? p.searchKinds : st.kinds, res = searchProducts(items, st, ctx, kinds);
    const noun = kinds.map((k) => (KIND_NOUN[k] ?? k).replace(/^pair of /, "") + "s").join(" and ") || "products";
    return base({ products: res, state: { ...st, kinds, shown: [...st.shown, ...res.map((r) => r.id)].slice(-40) }, message: res.length ? `I found ${res.length} available ${noun}${st.colors.length ? ` in ${list(st.colors)}` : ""}${st.budget ? ` ${st.budget.scope === "item" ? "up to" : "under"} ${money(st.budget.amount, ctx.facts.currency)}` : ""}, best matches first.` : `Nothing in stock matches that${st.budget ? " budget" : ""}${st.colors.length ? ` in ${list(st.colors)}` : ""}. Try a higher budget or another color.`, chips: [{ label: "Build an outfit", text: "Build me an outfit" }, { label: "Higher budget", text: "Under $500" }] });
  }

  // ---- outfit ----
  const hasContext = st.occasion || st.season || st.style || st.anchorId || p.flags.fromCart || st.formality !== null;
  if (p.flags.fromCart && !st.anchorId) { const a = ctx.cartIds.map((id) => byId.get(id)).find((i) => i?.slot); if (a) { st = { ...st, anchorId: a.id }; } else return base({ message: "I can’t see anything in your cart (or you haven’t allowed me to look at it).", chips: SCENARIOS.slice(0, 4) }); }
  if (asksForBudget(text) && !st.budget) {
    const saved = ctx.profile?.derived.budget?.max;
    if (saved) st = { ...st, budget: { amount: saved, scope: "item" } };
    else return base({ ask: { slot: "budget", question: "What’s your total budget for the outfit?" }, message: "Happy to. What’s your total budget for the outfit?", chips: BUDGET_CHIPS, state: { ...st, pending: "budget" } });
  }
  if (!hasContext && !st.anchorId) return base({ ask: { slot: "occasion", question: "What is the outfit for?" }, message: st.budget ? `Got it, ${st.budget.scope === "item" ? "up to" : "under"} ${money(st.budget.amount, ctx.facts.currency)}${st.budget.scope === "item" ? " per item" : ""}. What is the outfit for?` : "Happy to help. What is the outfit for?", chips: OCCASION_CHIPS });
  const res = generateOutfits(items, st, ctx, { extra: p.flags.addSlots });
  const lim = st.budget?.scope === "total" ? st.budget.amount : null;
  if (!res.outfits.length) {
    const sf = res.shortfall;
    return base({ shortfall: sf, message: sf && lim ? `I couldn’t put together a full outfit under ${money(lim, ctx.facts.currency)} from what’s in stock${sf.min ? `. The lowest total I can make for this request is ${money(sf.min, ctx.facts.currency)}` : ""}. Would you like to raise the budget or change the request?` : "I couldn’t build a complete outfit that fits all of that from what’s in stock. Try relaxing one thing, such as a color to avoid or the budget.", chips: sf?.min ? [{ label: `Up to ${money(Math.ceil(sf.min / 1000) * 1000, ctx.facts.currency)}`, text: `Under $${Math.ceil(sf.min / 100 / 10) * 10}` }, { label: "Start over", text: "Start over" }] : [{ label: "Start over", text: "Start over" }, ...SCENARIOS.slice(0, 3)] });
  }
  const total = res.outfits[0]!.total.amount;
  const msg = `Here ${res.outfits.length === 1 ? "is an outfit" : `are ${res.outfits.length} different outfits`} for ${st.label ?? (st.season ? st.season : st.style ? `a ${st.style} look` : "you")}${st.season && st.label ? ` in ${st.season}` : ""}${lim ? `, each under ${money(lim, ctx.facts.currency)}` : ""}${ctx.profile ? ", shaped by your saved style preferences" : ""}. Every piece is in stock. Replace any item, preview the look on the avatar, or add what’s available to your cart.`;
  const chips: Chip[] = [{ label: "Show different outfits", text: "Show me different outfits" }, ...(st.formality === null || st.formality < 5 ? [{ label: "Make it dressier", text: "Make it dressier" }] : []), ...(st.formality === null || st.formality > 1 ? [{ label: "More casual", text: "Make it more casual" }] : []), { label: lim ? "Cheaper" : "Under $200", text: lim ? "Show me something cheaper" : "Under $200" }, ...(modeOf(st) === "summer" ? [] : [{ label: "Add a bag", text: "Add a bag" }])].slice(0, 5);
  return base({ outfits: res.outfits, message: msg, chips, state: { ...st, lastTotal: total, shown: [...st.shown, ...res.outfits.flatMap((o) => o.items.map((i) => i.id))].slice(-40), pending: null }, departments: topDepartments(items, res.outfits, st, ctx) });
}
const SLOT_KIND: Record<string, string> = { shoes: "sneaker", base: "tee", mid: "hoodie", outer: "jacket", bottom: "trousers", dress: "dress", bag: "bag", watch: "watch", glasses: "glasses" };

function deptRef(items: readonly StyleItem[], slug: string, name: string, st: AState, ctx: Ctx): DeptRef {
  const profile = requestProfile({ ...st, department: slug }, ctx); const here = items.filter((i) => i.department === slug && i.available);
  const ranked = here.filter((i) => passes(i, profile, noSignals())).map((i) => ({ i, s: scoreItem(i, profile, ctx.signals, ctx.names) })).sort((a, b) => b.s.score - a.s.score || (a.i.id < b.i.id ? -1 : 1));
  return { slug, name, tagline: "", available: here.length, why: `${here.length} item${here.length === 1 ? "" : "s"} in stock here.`, products: ranked.slice(0, 4).map((x) => toAItem(x.i, x.s.color, x.s.explanation)) };
}
function topDepartments(items: readonly StyleItem[], outfits: OutfitCard[], st: AState, ctx: Ctx): DeptRef[] {
  const count = new Map<string, number>(); outfits.forEach((o) => o.items.forEach((i) => count.set(i.department, (count.get(i.department) ?? 0) + 1)));
  return [...count].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 2).map(([slug, n]) => { const d = deptRef(items, slug, ctx.names.department(slug), st, ctx); return { ...d, products: [], why: `${n} of the pieces above come from here.` }; });
}

// ======================= validating what a model proposes =======================
export type ModelPlan = { reply: string; outfits?: { name: string; occasion?: string; productIds: string[]; note?: string }[]; products?: string[]; department?: string; followUps?: string[] };
export const isModelPlan = (x: unknown): x is ModelPlan => { const o = x as ModelPlan | null; return !!o && typeof o === "object" && typeof o.reply === "string" && (o.outfits === undefined || (Array.isArray(o.outfits) && o.outfits.every((f) => f && typeof f.name === "string" && Array.isArray(f.productIds) && f.productIds.every((p) => typeof p === "string")))) && (o.products === undefined || (Array.isArray(o.products) && o.products.every((p) => typeof p === "string"))); };

/** A model's text may not contain links or money amounts that are not exactly a verified price. Returns the problem, or null. */
export function checkText(text: string, allowedAmounts: Set<number>, currency: string): string | null {
  if (text.length > 1200) return "too long";
  if (/https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|shop)\b/i.test(text)) return "contains a link";
  for (const m of text.matchAll(/(?:US)?\$\s?(\d[\d,]*(?:\.\d{1,2})?)|\b(\d[\d,]*(?:\.\d{1,2})?)\s?(?:dollars|usd)\b/gi)) { const v = Math.round(Number((m[1] ?? m[2])!.replace(/,/g, "")) * 100); if (!allowedAmounts.has(v)) return `contains an unverified price (${money(v, currency)})`; }
  return null;
}

export type PlanCheck = { outfits: OutfitCard[]; products: AItem[]; department: string | null; reply: string | null; dropped: string[] };
/** Every product reference must exist, be in stock and fit together; prices, sizes and links always come from the catalog. */
export function validatePlan(plan: ModelPlan, items: readonly StyleItem[], st: AState, ctx: Ctx): PlanCheck {
  const byId = new Map(items.map((i) => [i.id, i])), dropped: string[] = []; const resolve = (id: string) => byId.get(id) as never;
  const g: Gen = { items, byId, profile: requestProfile(st, ctx), st, ctx, used: new Set(), avoidIds: new Set() };
  const outfits: OutfitCard[] = []; const limit = st.budget?.scope === "total" ? st.budget.amount : null;
  for (const o of (plan.outfits ?? []).slice(0, 4)) {
    const ids = [...new Set(o.productIds)];
    const unknown = ids.filter((id) => !byId.has(id)); if (unknown.length) { dropped.push(`outfit “${o.name.slice(0, 40)}”: unknown product ${unknown.slice(0, 2).join(", ")}`); continue; }
    const its = ids.map((id) => byId.get(id)!);
    const sold = its.filter((i) => !i.available || !i.slot || i.price?.currency !== ctx.facts.currency); if (sold.length) { dropped.push(`outfit “${o.name.slice(0, 40)}”: ${sold[0]!.name} is not available`); continue; }
    let picks: Picks = {}; const chosen: Built["chosen"] = []; let conflict = false;
    for (const it of its) { const before = Object.keys(picks).length; const color = colorsInStock(it)[0]?.name ?? null; const r = place(picks, it as never, { productId: it.id, sku: null, size: null, color }, resolve); if (r.removed.length || Object.keys(r.picks).length !== before + 1) { conflict = true; break; } picks = r.picks; chosen.push({ part: P(it.kind, [it.slot!]), item: it, color }); }
    if (conflict || chosen.length < 2) { dropped.push(`outfit “${o.name.slice(0, 40)}”: pieces do not fit together`); continue; }
    const total = chosen.reduce((n, c) => n + priceOf(c.item), 0);
    if (limit && total > limit) { dropped.push(`outfit “${o.name.slice(0, 40)}”: over budget`); continue; }
    const b: Built = { recipe: { id: "model", title: o.name.slice(0, 60), parts: [], note: o.note && !checkText(o.note, new Set(chosen.map((c) => priceOf(c.item))), ctx.facts.currency) ? o.note.slice(0, 200) : "Pieces chosen to work together." }, picks, chosen, total };
    outfits.push(toCard(b, st, ctx, g, limit));
  }
  const products: AItem[] = []; for (const id of plan.products ?? []) { const it = byId.get(id); if (!it || !it.available || !it.slot) { dropped.push(`product ${id.slice(0, 30)}`); continue; } products.push(toAItem(it, colorsInStock(it)[0]?.name ?? null)); }
  const dept = plan.department && ctx.facts.departments.some((d) => d.slug === plan.department) ? plan.department : null; if (plan.department && !dept) dropped.push(`department ${String(plan.department).slice(0, 30)}`);
  const allowed = new Set<number>(); [...outfits.flatMap((o) => [o.total.amount, ...o.items.map((i) => i.price?.amount ?? -1)]), ...products.map((p) => p.price?.amount ?? -1)].forEach((a) => allowed.add(a)); if (limit) allowed.add(limit);
  const problem = checkText(plan.reply, allowed, ctx.facts.currency);
  return { outfits, products, department: dept, reply: problem ? null : plan.reply, dropped: problem ? [...dropped, `reply ${problem}`] : dropped };
}

// ======================= conversation state from the network =======================
export function sanitizeState(raw: unknown, facts: Facts, known: ReadonlySet<string>): AState {
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<AState>, base = emptyState();
  const pick = <T extends string>(v: unknown, allowed: readonly T[]): T | null => (typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : null);
  const colorNames = new Set(facts.colors.map((c) => c.name)), colors = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && colorNames.has(x)).slice(0, 6) : []);
  const b = o.budget as Budget | null | undefined;
  return {
    ...base, occasion: pick(o.occasion, OCCASIONS), label: typeof o.label === "string" ? o.label.slice(0, 40) : null, formality: typeof o.formality === "number" && o.formality >= 1 && o.formality <= 5 ? Math.round(o.formality) : null,
    season: pick(o.season, SEASONS), style: pick(o.style, STYLES), budget: b && typeof b.amount === "number" && b.amount >= 1000 && b.amount <= 10_000_000 && (b.scope === "total" || b.scope === "item") ? { amount: Math.round(b.amount), scope: b.scope } : null,
    anchorId: typeof o.anchorId === "string" && known.has(o.anchorId) ? o.anchorId : null, department: typeof o.department === "string" && facts.departments.some((d) => d.slug === o.department) ? o.department : null,
    audience: o.audience === "men" || o.audience === "women" ? o.audience : "all", colors: colors(o.colors), avoid: colors(o.avoid), kinds: Array.isArray(o.kinds) ? o.kinds.filter((k): k is string => typeof k === "string" && k.length < 20).slice(0, 4) : [],
    pending: pick(o.pending, ["occasion", "budget", "anchor"] as const), lastIntent: pick(o.lastIntent, ["outfit", "match", "search", "department", "help", "reset", "unknown"] as const),
    lastTotal: typeof o.lastTotal === "number" && o.lastTotal > 0 && o.lastTotal < 1e9 ? Math.round(o.lastTotal) : null, round: typeof o.round === "number" ? Math.max(0, Math.min(50, Math.round(o.round))) : 0,
    shown: Array.isArray(o.shown) ? o.shown.filter((x): x is string => typeof x === "string" && known.has(x)).slice(-40) : [],
  };
}
export { OCCASION_LABEL };
