import "server-only";
import { answer, alternativesFor, generateOutfits, emptyState, isModelPlan, matchesFor, parse, requestProfile, sanitizeState, toAItem, validatePlan, type AItem, type Answer, type AState, type Ctx, type DeptRef, type ModelPlan } from "@/modules/assistant/core";
import { colorsInStock, type Slot } from "@/modules/outfit/core";
import { noSignals, sanitizeProfile, type Signals, type StyleItem } from "@/modules/style/core";
import { getFacts, getNames, getStyleItems } from "@/server/catalog/style-items";
import { assistantProviderStatus } from "./providers";
import { ProviderError, type AssistantProvider, type ToolApi, type ToolProduct } from "./providers/provider";
import { locateDepartment, type DeptLocation } from "./mall";

export type Authorized = { profile: boolean; cart: boolean; outfits: boolean; page: boolean };
export type ChatContext = { authorized: Authorized; profileAnswers?: unknown; cartProductIds?: string[]; savedOutfitProductIds?: string[]; currentProductId?: string | null; currentDepartment?: string | null };
export type LocatedDept = DeptRef & { location: DeptLocation | null };
export type ChatResponse = {
  source: "rules" | "provider"; provider: { id: string; label: string; test: boolean } | null;
  notice: string | null; error: { code: string; message: string } | null;
  answer: Omit<Answer, "departments"> & { departments: LocatedDept[] };
  /** What personal context was actually used (only what the shopper authorized). */
  used: { profile: boolean; cart: boolean; outfits: boolean; page: boolean };
};
const TIMEOUT = () => Number(process.env.ASSISTANT_TIMEOUT_MS) || 20_000;

function buildCtx(items: readonly StyleItem[], c: ChatContext) {
  const facts = getFacts(items), names = getNames(facts), known = new Set(items.map((i) => i.id)), a = c.authorized;
  const profile = a.profile && c.profileAnswers ? sanitizeProfile({ answers: c.profileAnswers }, facts) : null;
  const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && known.has(x)).slice(0, 100) : []);
  const cart = a.cart ? ids(c.cartProductIds) : [], saved = a.outfits ? ids(c.savedOutfitProductIds) : [];
  const signals: Signals = a.outfits && saved.length ? { ...noSignals(), outfits: saved, consent: { favorites: false, outfits: true, views: false, purchases: false } } : noSignals();
  const curProd = a.page && typeof c.currentProductId === "string" && known.has(c.currentProductId) ? c.currentProductId : null;
  const curDept = a.page && typeof c.currentDepartment === "string" && facts.departments.some((d) => d.slug === c.currentDepartment) ? c.currentDepartment : null;
  const ctx: Ctx = { facts, names, profile, signals, cartIds: cart, currentProductId: curProd, currentDepartment: curDept };
  return { ctx, known, used: { profile: !!profile, cart: cart.length > 0, outfits: saved.length > 0, page: !!(curProd || curDept) } };
}
const locate = (a: Answer): ChatResponse["answer"] => ({ ...a, departments: a.departments.map((d) => ({ ...d, location: locateDepartment(d.slug) })) });

function tools(items: readonly StyleItem[], st: AState, ctx: Ctx): ToolApi {
  const tp = (i: StyleItem): ToolProduct => ({ id: i.id, name: i.name, brand: i.brandName, kind: i.kind, department: i.department, price: i.price?.amount ?? null, currency: i.price?.currency ?? ctx.facts.currency, colors: colorsInStock(i).map((c) => c.name), sizesInStock: [...new Set(i.variants.filter((v) => v.stock > 0 && v.size).map((v) => v.size!))] });
  const live = items.filter((i) => i.available);
  return {
    searchProducts: (f) => live.filter((i) => (!f.kinds || f.kinds.includes(i.kind)) && (!f.departments || f.departments.includes(i.department)) && (!f.maxPrice || (i.price?.amount ?? Infinity) <= f.maxPrice) && (!f.colors || colorsInStock(i).some((c) => f.colors!.includes(c.name)))).slice(0, Math.min(40, f.limit ?? 20)).map(tp),
    getProduct: (id) => { const i = live.find((x) => x.id === id); return i ? tp(i) : null; },
    buildOutfits: () => generateOutfits(items, { ...st, pending: null }, ctx).outfits.map((o) => ({ name: o.title, productIds: o.items.map((i) => i.id) })),
    matchesFor: (id, slot) => { const a = live.find((x) => x.id === id); return a ? matchesFor(items, st, ctx, a, slot as Slot, 6).map((m) => tp(items.find((x) => x.id === m.id)!)) : []; },
    departmentInfo: (slug) => { const d = ctx.facts.departments.find((x) => x.slug === slug); return d ? { slug, name: d.name, available: live.filter((i) => i.department === slug).length } : null; },
  };
}
const withTimeout = <T,>(run: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> => { const ac = new AbortController(); return new Promise<T>((res, rej) => { const t = setTimeout(() => { ac.abort(); rej(new ProviderError("The model took too long to answer.", "timeout")); }, ms); run(ac.signal).then((v) => { clearTimeout(t); res(v); }, (e) => { clearTimeout(t); rej(e); }); }); };

export async function chat(input: { message: string; state: unknown; context: ChatContext; history?: { role: "user" | "assistant"; text: string }[]; testMode?: string | null }): Promise<ChatResponse> {
  const items = getStyleItems(), { ctx, known, used } = buildCtx(items, input.context);
  const state = sanitizeState(input.state, ctx.facts, known);
  const rules = answer(items, input.message, state, ctx);
  const st = assistantProviderStatus();
  const base = (over: Partial<ChatResponse>): ChatResponse => ({ source: "rules", provider: null, notice: st.available ? null : st.message, error: null, answer: locate(rules), used, ...over });
  const wantsModel = ["outfit", "match", "search"].includes(rules.intent) && !rules.ask && (rules.outfits.length > 0 || rules.products.length > 0);
  if (!st.available || !wantsModel) return base({});
  const provider: AssistantProvider = st.provider, info = { id: provider.id, label: provider.label, test: provider.test };
  try {
    const parsed = parse(input.message, state, { facts: ctx.facts, products: [], currentProductId: ctx.currentProductId, currentDepartment: ctx.currentDepartment });
    const plan = await withTimeout((signal) => provider.respond({ message: input.message.slice(0, 500), history: (input.history ?? []).slice(-6), understanding: { intent: rules.intent, understood: parsed.understood, budget: rules.state.budget?.amount ?? null }, tools: tools(items, rules.state, ctx), testMode: provider.test ? input.testMode ?? undefined : undefined, signal }), TIMEOUT());
    if (!isModelPlan(plan)) throw new ProviderError("The model returned a reply in an unexpected format.", "invalid_response");
    const check = validatePlan(plan as ModelPlan, items, rules.state, ctx);
    if (!check.outfits.length && !check.products.length) return base({ provider: info, notice: `The model’s suggestions could not be verified against our catalog, so these are the stylist’s rule-based suggestions instead.${check.dropped.length ? ` (Removed: ${check.dropped.slice(0, 3).join("; ")}.)` : ""}`, error: null });
    const p = rules.state; const fromModel = check.outfits.length ? { outfits: check.outfits, products: rules.products } : { outfits: [], products: check.products };
    return base({
      source: "provider", provider: info, notice: check.dropped.length ? `Some of the model’s suggestions were removed because they did not match our catalog or were unverifiable (${check.dropped.slice(0, 3).join("; ")}).` : null,
      answer: locate({ ...rules, ...fromModel, message: check.reply ?? rules.message, state: { ...p, shown: [...p.shown, ...check.outfits.flatMap((o) => o.items.map((i) => i.id))].slice(-40) } }),
    });
  } catch (e) {
    const code = e instanceof ProviderError ? e.code : "provider_error";
    const message = code === "timeout" ? "The AI service took too long to answer." : code === "invalid_response" ? "The AI service returned a reply we could not use." : "The AI service is unavailable right now.";
    return base({ provider: info, error: { code, message }, notice: `${message} Showing the stylist’s rule-based suggestions instead.` });
  }
}

export function alternatives(input: { state: unknown; context: ChatContext; outfitIds: string[]; slot: Slot; exclude?: string[]; limit?: number }): AItem[] {
  const items = getStyleItems(), { ctx, known } = buildCtx(items, input.context);
  const ids = input.outfitIds.filter((id) => known.has(id)).slice(0, 10);
  return alternativesFor(items, sanitizeState(input.state, ctx.facts, known), ctx, ids, input.slot, { limit: input.limit, exclude: (input.exclude ?? []).filter((id) => known.has(id)) });
}
export { emptyState, requestProfile, toAItem };
