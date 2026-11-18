import "server-only";
import { createHmac, randomInt } from "node:crypto";
import { computeTotals } from "@/modules/commerce/pricing";
import { shippingOptions } from "@/modules/commerce/shipping";
import { checkoutInput, type CartLineInput, type Order, type OrderLine, type OrderStatus, type User } from "@/modules/commerce/types";
import { effectivePrice, isDemo, resolveStock, type Product } from "@/modules/catalog/types";
import { fail, mutate, ok, readStore, type Result, type StoreData } from "@/server/store/db";
import type { PaymentEventIn, PaymentProvider } from "@/server/payments/provider";

export const RESERVE_MINUTES = 30;
/** Pending (asynchronous) payments keep their stock held longer. */
const PENDING_HOLD_HOURS = 24;

// ---------- access ----------
/** Guests open their order with this token (in the confirmation link). Derived from the secret, so nothing extra is stored. */
export const orderToken = (id: string) => createHmac("sha256", process.env.SESSION_SECRET ?? "").update(`order:${id}`).digest("base64url").slice(0, 32);
export const canView = (o: Order, user: User | null, token: string | null) => (user && o.userId === user.id) || (!!token && token === orderToken(o.id));

/** What a customer sees: no internal notes. */
export const customerView = ({ notes: _n, ...o }: Order) => o;

// ---------- stock ----------
const variantOf = (p: Product, l: { sku: string | null; size: string | null; color: string | null }) =>
  l.sku ? p.variants.find((v) => v.sku === l.sku) : p.variants.find((v) => (v.size ?? null) === (l.size ?? null) && (v.color ?? null) === (l.color ?? null));

/** Units held by other orders that are still awaiting payment. */
export function reservedQty(d: StoreData, sku: string, exceptOrderId?: string, now = Date.now()): number {
  let n = 0;
  for (const o of d.orders) {
    if (o.id === exceptOrderId || o.payment.status !== "pending" || !o.reservedUntil || o.reservedUntil < now) continue;
    for (const l of o.lines) if (l.sku === sku) n += l.quantity;
  }
  return n;
}

export type LineCheck = {
  input: CartLineInput; ok: boolean; issues: string[];
  line?: OrderLine; maxQuantity?: number; currency?: string;
  /** Every variant of the product with its available units, so the cart can offer a variant change. */
  options?: { sku: string; size: string | null; color: string | null; available: number }[];
  /** Present for checked lines so the cart can show the current state. */
  product?: { name: string; slug: string; image: string | null; brandName: string; sku: string | null; size: string | null; color: string | null };
};

/** Validates cart lines against the database: product exists, variant exists, stock, price, and whether Vestora may sell it. Never trusts client prices. */
export function checkLines(d: StoreData, lines: readonly CartLineInput[], opts: { testPayments: boolean; exceptOrderId?: string }): LineCheck[] {
  const brandName = (slug: string) => d.brands.find((b) => b.slug === slug)?.name ?? slug;
  return lines.map((input) => {
    const p = d.products.find((x) => x.id === input.productId);
    if (!p) return { input, ok: false, issues: ["This product is no longer in the catalog."] };
    const issues: string[] = [];
    const demo = isDemo(p);
    if (p.source.kind === "affiliate-feed") issues.push(`Sold by ${p.source.retailer ?? "another seller"}: buy it on their site.`);
    if (demo && !opts.testPayments) issues.push("Demo products cannot be bought with a live payment provider.");
    const price = effectivePrice(p);
    if (!price) issues.push("This product has no verified price.");
    if (p.variants.length === 0) issues.push("Stock is not tracked for this product, so it cannot be sold here.");
    const v = variantOf(p, input);
    if (p.variants.length > 0 && !v) issues.push("That size and color combination does not exist.");
    let maxQuantity: number | undefined;
    if (v) {
      maxQuantity = Math.max(0, v.stock - reservedQty(d, v.sku, opts.exceptOrderId));
      if (maxQuantity === 0) issues.push("Out of stock.");
      else if (input.quantity > maxQuantity) issues.push(`Only ${maxQuantity} available.`);
    }
    const options = p.variants.map((x) => ({ sku: x.sku, size: x.size, color: x.color, available: Math.max(0, x.stock - reservedQty(d, x.sku, opts.exceptOrderId)) }));
    const product = { name: p.name, slug: p.slug, image: p.images[0]?.url ?? null, brandName: brandName(p.brand), sku: v?.sku ?? null, size: v?.size ?? input.size, color: v?.color ?? input.color };
    if (issues.length > 0 || !v || !price) return { input, ok: false, issues, maxQuantity, product, currency: price?.currency, options };
    const regular = p.price?.amount ?? price.amount;
    return { input, ok: true, issues, maxQuantity, product, currency: price.currency, options, line: { productId: p.id, slug: p.slug, name: p.name, brandName: brandName(p.brand), image: product.image, sku: v.sku, size: v.size, color: v.color, quantity: input.quantity, unitRegular: regular, unitPrice: price.amount, demo } };
  });
}

// ---------- ids ----------
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const newOrderId = (d: StoreData): string => {
  for (;;) {
    const id = "VST-" + Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
    if (!d.orders.some((o) => o.id === id)) return id;
  }
};
const stamp = () => new Date().toISOString();
const log = (o: Order, event: string) => { o.history.push({ at: stamp(), event }); o.updatedAt = stamp(); };

// ---------- create ----------
export type Quote = { checks: LineCheck[]; lines: OrderLine[]; shippingOptions: ReturnType<typeof shippingOptions>; totals: Order["totals"] | null; errors: string[] };

/** Prices a cart from the database for a destination and method. Used by every checkout step so the numbers shown are the server's. */
export function quote(d: StoreData, lines: readonly CartLineInput[], country: string | null, methodId: string | null, testPayments: boolean): Quote {
  const checks = checkLines(d, lines, { testPayments });
  const errors = checks.flatMap((c) => c.issues.map((i) => `${c.product?.name ?? "Item"}: ${i}`));
  // The same variant on two lines must fit in stock together.
  const bySku = new Map<string, { qty: number; max: number; name: string }>();
  for (const c of checks) if (c.product?.sku && c.maxQuantity !== undefined) { const e = bySku.get(c.product.sku) ?? { qty: 0, max: c.maxQuantity, name: c.product.name }; e.qty += c.input.quantity; bySku.set(c.product.sku, e); }
  for (const e of bySku.values()) if (e.qty > e.max && e.max > 0) errors.push(`${e.name}: only ${e.max} available in total.`);
  const good = checks.filter((c): c is LineCheck & { line: OrderLine } => c.ok && !!c.line).map((c) => c.line);
  const currencies = new Set(good.map((l) => checks.find((c) => c.line === l)?.currency));
  if (currencies.size > 1) errors.push("Your cart mixes currencies. Check out those items separately.");
  const currency = [...currencies][0] ?? "USD";
  const subtotal = good.reduce((n, l) => n + l.unitPrice * l.quantity, 0);
  const options = shippingOptions(country ?? "US", subtotal);
  const method = methodId ? options.find((m) => m.id === methodId) : undefined;
  return { checks, lines: good, shippingOptions: options, totals: good.length ? computeTotals(good, method?.price ?? 0, currency!) : null, errors };
}

export async function createOrder(raw: unknown, user: User | null, provider: PaymentProvider): Promise<Result<Order>> {
  const parsed = checkoutInput.safeParse(raw);
  if (!parsed.success) return fail(400, ...parsed.error.issues.map((i) => `${i.path.join(".") || "order"}: ${i.message}`));
  const input = parsed.data;
  return mutate(user?.id ?? "guest", "order-create", (d) => {
    // A repeat of the same submission returns the order that is still open (or already paid). A failed, cancelled or expired attempt does not block a new one.
    const dupe = d.orders.find((o) => o.idempotencyKey === input.idempotencyKey && o.customer.email === input.customer.email && (o.payment.status === "pending" || o.payment.status === "paid"));
    if (dupe) return ok(dupe);
    const q = quote(d, input.lines, input.shippingAddress.country, input.shippingMethod, provider.test);
    if (q.errors.length > 0 || q.lines.length !== input.lines.length || !q.totals) return fail(409, ...(q.errors.length ? q.errors : ["Some items cannot be ordered."]));
    const method = q.shippingOptions.find((m) => m.id === input.shippingMethod);
    if (!method) return fail(400, "Choose a shipping method");
    const now = Date.now();
    const o: Order = {
      id: newOrderId(d), idempotencyKey: input.idempotencyKey, userId: user?.id ?? null,
      customer: { email: input.customer.email, name: input.customer.name, phone: input.customer.phone },
      shippingAddress: input.shippingAddress, shippingMethod: { id: method.id, label: method.label, price: method.price, estimate: method.estimate },
      lines: q.lines, totals: q.totals,
      payment: { provider: provider.id, providerRef: null, status: "pending", test: provider.test, paidAt: null, note: null },
      status: "awaiting_payment", reservedUntil: now + RESERVE_MINUTES * 60_000, stockCommitted: false, refundRequired: false, tracking: null, notes: [], history: [], createdAt: stamp(), updatedAt: stamp(),
    };
    log(o, `Order created. Stock held for ${RESERVE_MINUTES} minutes while payment is pending.`);
    d.orders.push(o);
    if (user && input.saveAddress) {
      const u = d.users.find((x) => x.id === user.id);
      const a = input.shippingAddress;
      if (u && u.addresses.length < 20 && !u.addresses.some((x) => x.line1 === a.line1 && x.postalCode === a.postalCode && x.country === a.country)) {
        u.addresses.push({ ...a, id: `a_${o.id}`, label: "", isDefault: u.addresses.length === 0 });
      }
    }
    return ok(o);
  });
}

/** Opens (or reopens) the provider's payment page for a pending order. */
export async function startPayment(orderId: string, provider: PaymentProvider, origin: string): Promise<Result<{ redirectUrl: string }>> {
  const o = readStore().data.orders.find((x) => x.id === orderId);
  if (!o) return fail(404, "Order not found");
  if (o.payment.status !== "pending") return fail(409, `This order is ${o.payment.status}; payment cannot be started.`);
  if (o.payment.provider !== provider.id) return fail(409, "The payment provider for this order is no longer available.");
  if (!o.reservedUntil || o.reservedUntil < Date.now()) {
    // Reservation lapsed: re-check stock and hold it again, or tell the shopper to start over.
    const r = await mutate("customer", "order-rehold", (d) => {
      const x = d.orders.find((y) => y.id === orderId)!;
      const checks = checkLines(d, x.lines.map((l) => ({ productId: l.productId, sku: l.sku, size: l.size, color: l.color, quantity: l.quantity })), { testPayments: provider.test, exceptOrderId: orderId });
      if (checks.some((c) => !c.ok)) { x.payment.status = "expired"; x.status = "cancelled"; log(x, "Stock hold expired and items are no longer available."); return fail(409, "Your stock hold expired and some items are no longer available. Please start again."); }
      x.reservedUntil = Date.now() + RESERVE_MINUTES * 60_000; log(x, "Stock hold renewed."); return ok(null);
    });
    if (!r.ok) return r;
  }
  const fresh = readStore().data.orders.find((x) => x.id === orderId)!;
  const base = `${origin}/checkout/confirmation/${orderId}?t=${orderToken(orderId)}`;
  let session;
  try { session = await provider.createSession(fresh, { success: base, cancel: `${base}&cancelled=1` }); }
  catch (e) { return fail(502, `The payment provider could not start the payment (${e instanceof Error ? e.message : "unknown error"}). Nothing was charged.`); }
  await mutate("system", "order-session", (d) => { const x = d.orders.find((y) => y.id === orderId)!; x.payment.providerRef = session.providerRef; log(x, `Payment page opened with ${provider.label}.`); return ok(null); });
  // Relative (own-site) payment pages need the order token so only the shopper can open them.
  return ok({ redirectUrl: session.redirectUrl.startsWith("/") ? `${session.redirectUrl}?t=${orderToken(orderId)}` : session.redirectUrl });
}

/** Closes an order whose payment could not even be started, so its stock is released at once. */
export const abandonOrder = (id: string, reason: string) => mutate("system", "order-abandon", (d) => {
  const o = d.orders.find((x) => x.id === id);
  if (o && o.payment.status === "pending") { o.payment.status = "failed"; o.payment.note = reason; o.status = "cancelled"; o.reservedUntil = null; log(o, reason); }
  return ok(null);
});

// ---------- payment events ----------
const settleStock = (d: StoreData, o: Order): boolean => {
  const need = new Map<string, number>();
  for (const l of o.lines) need.set(l.sku, (need.get(l.sku) ?? 0) + l.quantity);
  const slots: { v: Product["variants"][number]; qty: number }[] = [];
  for (const [sku, qty] of need) {
    const v = d.products.flatMap((p) => p.variants).find((x) => x.sku === sku);
    if (!v || v.stock < qty) return false;
    slots.push({ v, qty });
  }
  slots.forEach(({ v, qty }) => { v.stock -= qty; });
  return true;
};

/** Applies a verified provider event. Idempotent: the same event id is acted on once. This is the ONLY way an order becomes paid. */
export function applyPaymentEvent(provider: PaymentProvider, ev: PaymentEventIn): Promise<Result<{ outcome: string; orderId: string | null }>> {
  return mutate(`webhook:${provider.id}`, `payment-${ev.type}`, (d) => {
    const key = `${provider.id}:${ev.id}`;
    const record = (outcome: string, orderId: string | null) => { d.paymentEvents.push({ key, provider: provider.id, orderId, type: ev.type, at: stamp(), outcome }); if (d.paymentEvents.length > 5000) d.paymentEvents.splice(0, d.paymentEvents.length - 5000); return ok({ outcome, orderId }); };
    if (d.paymentEvents.some((e) => e.key === key)) return ok({ outcome: "duplicate-ignored", orderId: ev.orderId });
    const o = d.orders.find((x) => x.id === ev.orderId);
    if (!o) return record("unknown-order", null);
    if (o.payment.provider !== provider.id) return record("wrong-provider", o.id);

    if (ev.type === "paid") {
      if (o.payment.status === "paid") return record("already-paid", o.id);
      if (ev.amount !== o.totals.total || (ev.currency ?? "").toUpperCase() !== o.totals.currency) {
        o.status = "needs_attention"; o.payment.note = `Provider reported ${ev.amount} ${ev.currency}, expected ${o.totals.total} ${o.totals.currency}. Not marked paid.`;
        log(o, o.payment.note); return record("amount-mismatch", o.id);
      }
      const late = o.payment.status !== "pending" || (o.reservedUntil ?? 0) < Date.now();
      o.payment.status = "paid"; o.payment.paidAt = stamp(); o.reservedUntil = null;
      if (settleStock(d, o)) { o.stockCommitted = true; o.status = "processing"; log(o, late ? "Payment confirmed after the stock hold ended; stock was still available." : "Payment confirmed by the provider. Stock updated."); return record("paid", o.id); }
      o.status = "needs_attention"; o.refundRequired = true; o.payment.note = "Paid, but stock ran out before confirmation. Refund the customer or restock.";
      log(o, o.payment.note); return record("paid-without-stock", o.id);
    }
    if (o.payment.status === "paid") return record("ignored-after-paid", o.id);
    if (ev.type === "pending") { o.reservedUntil = Date.now() + PENDING_HOLD_HOURS * 3600_000; log(o, "Provider reports the payment is still processing."); return record("pending", o.id); }
    const status = ev.type === "failed" ? "failed" : ev.type === "cancelled" ? "cancelled" : "expired";
    if (o.payment.status === "pending" || o.payment.status === status) {
      o.payment.status = status; o.status = "cancelled"; o.reservedUntil = null;
      log(o, status === "failed" ? "Payment failed. Stock released." : status === "cancelled" ? "Payment was cancelled. Stock released." : "Payment session expired. Stock released.");
    }
    return record(status, o.id);
  });
}

// ---------- reading ----------
export const getOrder = (id: string) => readStore().data.orders.find((o) => o.id === id) ?? null;
export const ordersForUser = (userId: string) => readStore().data.orders.filter((o) => o.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export type OrderQuery = { q?: string; status?: string; payment?: string; page?: number; pageSize?: number };
export function searchOrders(query: OrderQuery) {
  const q = (query.q ?? "").trim().toLowerCase();
  let list = readStore().data.orders.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (query.status) list = list.filter((o) => o.status === query.status);
  if (query.payment) list = list.filter((o) => o.payment.status === query.payment);
  if (q) list = list.filter((o) => [o.id, o.customer.email, o.customer.name, o.payment.providerRef ?? "", ...o.lines.map((l) => `${l.name} ${l.sku}`)].join(" ").toLowerCase().includes(q));
  const pageSize = Math.min(100, query.pageSize ?? 25), page = Math.max(1, query.page ?? 1);
  return { total: list.length, page, pageSize, orders: list.slice((page - 1) * pageSize, page * pageSize) };
}

// ---------- admin changes ----------
const NEXT: Partial<Record<OrderStatus, OrderStatus[]>> = {
  processing: ["packed", "shipped", "cancelled"], packed: ["shipped", "processing", "cancelled"], shipped: ["delivered"], needs_attention: ["processing", "cancelled"], delivered: [], cancelled: [], awaiting_payment: ["cancelled"],
};

export function updateFulfilment(id: string, actor: string, change: { status?: unknown; tracking?: unknown; note?: unknown }): Promise<Result<Order>> {
  return mutate(actor, "order-update", (d) => {
    const o = d.orders.find((x) => x.id === id);
    if (!o) return fail(404, "Order not found");
    if (typeof change.status === "string" && change.status !== o.status) {
      const to = change.status as OrderStatus;
      if (!(NEXT[o.status] ?? []).includes(to)) return fail(409, `An order that is "${o.status}" cannot move to "${to}".`);
      if (to !== "cancelled" && o.payment.status !== "paid") return fail(409, "Only paid orders can be fulfilled. Payment is " + o.payment.status + ".");
      if (to === "cancelled") {
        if (o.payment.status === "paid") {
          if (o.stockCommitted) for (const l of o.lines) { const v = d.products.flatMap((p) => p.variants).find((x) => x.sku === l.sku); if (v) v.stock += l.quantity; }
          o.stockCommitted = false; o.refundRequired = true; log(o, "Cancelled by admin after payment. Stock restored. REFUND REQUIRED: refund in the payment provider's dashboard.");
        } else { o.payment.status = o.payment.status === "pending" ? "cancelled" : o.payment.status; o.reservedUntil = null; log(o, "Cancelled by admin before payment. Stock released."); }
      } else log(o, `Status changed from ${o.status} to ${to} by ${actor}.`);
      o.status = to;
    }
    if (typeof change.tracking === "string") { o.tracking = change.tracking.trim().slice(0, 120) || null; log(o, `Tracking set to ${o.tracking ?? "none"}.`); }
    if (typeof change.note === "string" && change.note.trim()) o.notes.push({ at: stamp(), by: actor, text: change.note.trim().slice(0, 1000) });
    return ok(o);
  });
}

/** Paid orders are financial records and are kept (cancel them instead). Unpaid and test orders may be removed. */
export const deleteOrder = (id: string, actor: string): Promise<Result<null>> => mutate(actor, "order-delete", (d) => {
  const i = d.orders.findIndex((x) => x.id === id);
  if (i < 0) return fail(404, "Order not found");
  const o = d.orders[i]!;
  if (o.payment.status === "paid" && !o.payment.test) return fail(409, "A real paid order is a financial record and cannot be deleted. Cancel it instead.");
  if (o.stockCommitted) for (const l of o.lines) { const v = d.products.flatMap((p) => p.variants).find((x) => x.sku === l.sku); if (v) v.stock += l.quantity; }
  d.orders.splice(i, 1);
  return ok(null);
});
