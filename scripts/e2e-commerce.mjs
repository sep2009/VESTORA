// End-to-end checks of accounts, cart validation, checkout, the test payment provider and webhooks, inventory and admin orders.
// Needs a running server (default http://localhost:8765) started with .env.local: SESSION_SECRET, PAYMENT_WEBHOOK_SECRET, ALLOW_TEST_PAYMENTS=1.
// It creates and removes its own test orders and restores the stock it changes. Test accounts it registers remain in the dev database.
// Run: node scripts/e2e-commerce.mjs
import { createHmac, randomUUID } from "node:crypto";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:8765";
const env = readFileSync(".env.local", "utf8");
const WH = env.match(/^PAYMENT_WEBHOOK_SECRET=(.+)$/m)?.[1];
let pass = 0, failN = 0;
const t = (name, cond, extra) => { if (cond) pass++; else { failN++; console.log("FAIL", name, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ""); } };

class Client {
  cookies = {};
  async call(method, path, body, headers = {}) {
    const h = { "x-vestora-csrf": "1", origin: BASE, ...(body !== undefined ? { "content-type": "application/json" } : {}), ...headers };
    const cookie = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
    if (cookie) h.cookie = cookie;
    const res = await fetch(BASE + path, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined, redirect: "manual" });
    for (const sc of res.headers.getSetCookie?.() ?? []) { const [kv] = sc.split(";"); const i = kv.indexOf("="); const k = kv.slice(0, i), v = kv.slice(i + 1); if (v) this.cookies[k] = v; else delete this.cookies[k]; }
    let json = null; try { json = await res.json(); } catch { /* not json */ }
    return { status: res.status, json };
  }
}
const admin = new Client();
admin.cookies.vestora_session = execSync("node scripts/dev-session-token.mjs admin").toString().trim();
const editor = new Client();
editor.cookies.vestora_session = execSync("node scripts/dev-session-token.mjs editor").toString().trim();
const guest = new Client();

const addr = { fullName: "Test Person", line1: "1 Test Street", line2: "", city: "Springfield", region: "IL", postalCode: "62701", country: "US", phone: "" };
const sign = (raw) => createHmac("sha256", WH).update(raw).digest("hex");
const hook = async (_client, event, sig) => {
  const raw = JSON.stringify(event);
  const res = await fetch(BASE + "/api/payments/webhook/sandbox", { method: "POST", body: raw, headers: { "content-type": "application/json", "x-sandbox-signature": sig ?? sign(raw) } });
  return { status: res.status, json: await res.json() };
};
const evt = (order, type, over = {}) => ({ id: "evt_" + randomUUID(), type, orderId: order.orderId ?? order.id, providerRef: null, amount: over.amount, currency: over.currency ?? "USD", ...over });

// ---------- choose products ----------
const cat = (await guest.call("GET", "/api/catalog")).json;
const sale = cat.items.find((i) => i.compareAt && i.availability === "in_stock" && i.demo);
const plain = cat.items.filter((i) => !i.compareAt && i.availability === "in_stock" && i.demo)[0];
const prod = async (id) => (await admin.call("GET", `/api/admin/products/${id}`)).json;
const P = await prod(plain.id);
const V = P.variants.find((v) => v.stock >= 3) ?? P.variants[0];
const origStock = V.stock;
const setStock = (n) => admin.call("PUT", `/api/admin/products/${P.id}/stock`, { sku: V.sku, stock: n });
const stockNow = async () => (await prod(P.id)).variants.find((v) => v.sku === V.sku).stock;
await setStock(3);
const line = (q = 1) => ({ productId: P.id, sku: V.sku, size: V.size, color: V.color, quantity: q });
const checkout = (client, lines, key = randomUUID(), over = {}) => client.call("POST", "/api/checkout", { lines, customer: { email: "buyer@example.com", name: "Test Person", phone: "" }, shippingAddress: addr, shippingMethod: "standard", idempotencyKey: key, ...over });
const made = [];

// ---------- 1. cart validation ----------
let r = await guest.call("POST", "/api/cart/validate", { lines: [line(1)], country: "US", method: "standard" });
t("validate ok", r.status === 200 && r.json.lines[0].ok && r.json.totals.total > 0, r.json);
const unit = r.json.lines[0].unitPrice;
t("total = subtotal + shipping", r.json.totals.total === r.json.totals.subtotal + r.json.totals.shipping);
r = await guest.call("POST", "/api/cart/validate", { lines: [line(1), line(1)] });
t("two lines of same variant counted together vs stock still ok at 2", r.json.errors.length === 0);
r = await guest.call("POST", "/api/cart/validate", { lines: [line(5)] });
t("quantity above stock flagged", r.json.lines[0].ok === false && /Only 3/.test(r.json.lines[0].issues.join()), r.json.lines[0]);
r = await guest.call("POST", "/api/cart/validate", { lines: [{ productId: "nope-1", quantity: 1 }] });
t("unknown product flagged", r.json.lines[0].ok === false);
r = await guest.call("POST", "/api/cart/validate", { lines: [{ ...line(1), unitPrice: 1 }] });
t("client price ignored", r.json.lines[0].unitPrice === unit);
if (sale) {
  const SP = await prod(sale.id); const SV = SP.variants.find((v) => v.stock > 0);
  r = await guest.call("POST", "/api/cart/validate", { lines: [{ productId: SP.id, sku: SV.sku, size: SV.size, color: SV.color, quantity: 2 }] });
  t("sale price gives a discount", r.json.totals.discount > 0 && r.json.totals.subtotalRegular - r.json.totals.discount === r.json.totals.subtotal, r.json.totals);
}
r = await guest.call("POST", "/api/cart/validate", { lines: [line(1)], country: "DE", method: "express" });
t("international express costs more", r.json.shippingOptions.find((m) => m.id === "express").price > 1490);

// ---------- 2. accounts ----------
const email = `e2e+${Date.now()}@example.com`, pw = "correct horse battery";
const u = new Client();
r = await u.call("POST", "/api/auth/register", { email, name: "E2E User", password: "short" });
t("short password rejected", r.status === 400);
r = await u.call("POST", "/api/auth/register", { email: "not-an-email", name: "x", password: pw });
t("bad email rejected", r.status === 400);
r = await u.call("POST", "/api/auth/register", { email, name: "E2E User", password: pw });
t("register ok + cookie", r.status === 201 && !!u.cookies.vestora_customer && !r.json.user.passwordHash, r.json);
r = await new Client().call("POST", "/api/auth/register", { email, name: "Dupe", password: pw });
t("duplicate email 409", r.status === 409);
r = await u.call("GET", "/api/auth/me");
t("me returns user without secrets", r.json.user?.email === email && !("passwordHash" in r.json.user));
r = await new Client().call("POST", "/api/auth/login", { email, password: "wrong password!!" });
t("wrong password 401", r.status === 401);
r = await new Client().call("POST", "/api/auth/login", { email: "nobody@example.com", password: pw });
t("unknown email same 401", r.status === 401 && r.json.errors[0] === "Wrong email or password");
const u2 = new Client();
r = await u2.call("POST", "/api/auth/login", { email, password: pw });
t("login ok", r.status === 200 && !!u2.cookies.vestora_customer);
r = await u2.call("POST", "/api/auth/login", undefined, { "x-vestora-csrf": "" });
t("csrf header required", r.status === 403);
r = await u2.call("POST", "/api/auth/login", { email, password: pw }, { origin: "https://evil.example" });
t("cross-origin refused", r.status === 403);
r = await new Client().call("GET", "/api/account/orders");
t("orders need sign-in", r.status === 401);
const tampered = new Client(); tampered.cookies.vestora_customer = u.cookies.vestora_customer.slice(0, -3) + "AAA";
t("tampered cookie rejected", (await tampered.call("GET", "/api/auth/me")).json.user === null);
const adminAsCustomer = new Client(); adminAsCustomer.cookies.vestora_customer = admin.cookies.vestora_session;
t("admin cookie is not a customer session", (await adminAsCustomer.call("GET", "/api/auth/me")).json.user === null);
const asCustomer = new Client(); asCustomer.cookies.vestora_session = u.cookies.vestora_customer;
t("customer cookie is not an admin session", (await asCustomer.call("GET", "/api/admin/orders")).status === 401);

// profile, addresses, favorites
r = await u.call("PUT", "/api/account/profile", { name: "E2E Renamed", phone: "+1 555 0100" });
t("profile update", r.status === 200 && r.json.user.name === "E2E Renamed");
r = await u.call("POST", "/api/account/addresses", { ...addr, postalCode: "ABCDE" });
t("invalid postal code rejected", r.status === 400);
r = await u.call("POST", "/api/account/addresses", { ...addr, label: "Home" });
t("address saved + default", r.status === 200 && r.json.isDefault === true, r.json);
const aid = r.json.id;
r = await u.call("PUT", `/api/account/addresses/${aid}`, { ...addr, label: "Home 2", city: "Chicago" });
t("address edited", r.status === 200 && r.json.city === "Chicago");
r = await u.call("POST", "/api/account/favorites", { ids: [P.id, "not-a-product"] });
t("favorites merged, unknown dropped", r.json.ids.length === 1 && r.json.ids[0] === P.id, r.json);
r = await new Client().call("GET", `/api/account/addresses`);
t("addresses private", r.status === 401);
r = await u.call("DELETE", `/api/account/addresses/${aid}`);
t("address deleted", r.status === 200);

// password reset
r = await new Client().call("POST", "/api/auth/forgot", { email: "nobody@example.com" });
const r2 = await new Client().call("POST", "/api/auth/forgot", { email });
t("forgot answers identically", r.status === 200 && r2.status === 200 && r.json.message === r2.json.message);
const outbox = readFileSync("data/db/outbox.log", "utf8").trim().split("\n").map((l) => JSON.parse(l)).reverse().find((m) => m.to === email);
const token = outbox?.body.match(/token=([\w-]+)/)?.[1];
t("reset link delivered to outbox (mail not configured)", !!token);
r = await new Client().call("POST", "/api/auth/reset", { token: "x".repeat(40), password: "another long password" });
t("bad reset token rejected", r.status === 400);
r = await new Client().call("POST", "/api/auth/reset", { token, password: "short" });
t("weak new password rejected", r.status === 400);
const newPw = "brand new long password";
r = await new Client().call("POST", "/api/auth/reset", { token, password: newPw });
t("reset ok", r.status === 200);
r = await new Client().call("POST", "/api/auth/reset", { token, password: newPw + "2" });
t("reset token single use", r.status === 400);
t("old password no longer works", (await new Client().call("POST", "/api/auth/login", { email, password: pw })).status === 401);
t("old session signed out by reset", (await u.call("GET", "/api/auth/me")).json.user === null);
const ul = new Client();
t("new password works", (await ul.call("POST", "/api/auth/login", { email, password: newPw })).status === 200);
r = await ul.call("PUT", "/api/account/password", { current: "wrong", password: "yet another long one" });
t("change password needs current", r.status === 403);
// lockout
const lockEmail = `lock+${Date.now()}@example.com`;
await new Client().call("POST", "/api/auth/register", { email: lockEmail, name: "Lock", password: pw });
let last; for (let i = 0; i < 9; i++) last = await new Client().call("POST", "/api/auth/login", { email: lockEmail, password: "wrong wrong wrong" });
t("account locks after repeated failures", last.status === 429 || (await new Client().call("POST", "/api/auth/login", { email: lockEmail, password: pw })).status === 429);

// ---------- 3. checkout validation ----------
r = await checkout(guest, [line(1)], randomUUID(), { customer: { email: "bad", name: "", phone: "" } });
t("server rejects bad customer", r.status === 400, r.json);
r = await checkout(guest, [line(1)], randomUUID(), { shippingAddress: { ...addr, postalCode: "1" } });
t("server rejects bad postal code", r.status === 400);
r = await checkout(guest, [line(1)], randomUUID(), { shippingAddress: { ...addr, country: "ZZ" } });
t("server rejects unsupported country", r.status === 400);
r = await checkout(guest, [line(1)], randomUUID(), { shippingMethod: "teleport" });
t("server rejects unknown shipping method", r.status === 409 || r.status === 400, r.json);
r = await checkout(guest, [line(9)]);
t("server rejects quantity above stock", r.status === 409, r.json);

// ---------- 4. order + payment lifecycle ----------
const key1 = randomUUID();
r = await checkout(guest, [line(1)], key1);
t("order created, awaiting payment", r.status === 200 && /^VST-/.test(r.json.orderId) && r.json.test === true && r.json.redirectUrl.includes("/checkout/sandbox/"), r.json);
const o1 = r.json; made.push(o1.orderId);
let ord = (await guest.call("GET", `/api/orders/${o1.orderId}?t=${o1.token}`)).json;
t("not paid yet (no fabricated success)", ord.payment.status === "pending" && ord.status === "awaiting_payment" && ord.payment.paidAt === null, ord);
t("price stored at purchase time", ord.lines[0].unitPrice === unit && ord.totals.total === unit + ord.totals.shipping);
t("stock unchanged before payment confirmation", (await stockNow()) === 3);
r = await checkout(guest, [line(1)], key1);
t("same idempotency key returns same order", r.json.orderId === o1.orderId);
t("order hidden without token", (await guest.call("GET", `/api/orders/${o1.orderId}`)).status === 404);
t("order hidden with wrong token", (await guest.call("GET", `/api/orders/${o1.orderId}?t=nope`)).status === 404);
r = await checkout(guest, [line(3)]);
t("reserved stock cannot be oversold (3 in stock, 1 held)", r.status === 409, r.json);
// webhook security
const bad = evt(o1, "paid", { amount: ord.totals.total });
r = await hook(guest, bad, "00".repeat(32));
t("webhook with bad signature rejected", r.status === 400);
r = await fetch(BASE + "/api/payments/webhook/sandbox", { method: "POST", body: JSON.stringify(bad) }).then(async (x) => ({ status: x.status }));
t("webhook without signature rejected", r.status === 400);
t("order still pending after rejected webhooks", (await guest.call("GET", `/api/orders/${o1.orderId}?t=${o1.token}`)).json.payment.status === "pending");
t("unknown provider rejected", (await fetch(BASE + "/api/payments/webhook/paypal", { method: "POST", body: "{}" })).status === 404);
r = await hook(guest, evt(o1, "paid", { amount: ord.totals.total - 1 }));
ord = (await guest.call("GET", `/api/orders/${o1.orderId}?t=${o1.token}`)).json;
t("wrong amount is not accepted as paid", r.json.outcome === "amount-mismatch" && ord.payment.status === "pending" && ord.status === "needs_attention", { r: r.json, s: ord.status });
// pending event, then paid
const pend = evt(o1, "pending", { amount: ord.totals.total });
r = await hook(guest, pend);
t("pending event keeps order pending", r.json.outcome === "pending");
const paid = evt(o1, "paid", { amount: ord.totals.total });
r = await hook(guest, paid);
ord = (await guest.call("GET", `/api/orders/${o1.orderId}?t=${o1.token}`)).json;
t("paid webhook confirms order and stock updates once", r.json.outcome === "paid" && ord.payment.status === "paid" && ord.status === "processing" && (await stockNow()) === 2, { r: r.json, s: ord.status });
r = await hook(guest, paid);
t("duplicate webhook ignored", r.json.outcome === "duplicate-ignored" && (await stockNow()) === 2);
r = await hook(guest, evt(o1, "paid", { amount: ord.totals.total }));
t("second paid event with new id does not double-decrement", r.json.outcome === "already-paid" && (await stockNow()) === 2);
r = await hook(guest, evt(o1, "failed", { amount: ord.totals.total }));
t("failure after paid is ignored", r.json.outcome === "ignored-after-paid" && (await guest.call("GET", `/api/orders/${o1.orderId}?t=${o1.token}`)).json.payment.status === "paid");
// failed
r = await checkout(guest, [line(1)]); const o2 = r.json; made.push(o2.orderId);
t("stock held by pending order", (await guest.call("POST", "/api/cart/validate", { lines: [line(1)] })).json.lines[0].maxQuantity === 1);
r = await hook(guest, evt(o2, "failed", { amount: 0 }));
ord = (await guest.call("GET", `/api/orders/${o2.orderId}?t=${o2.token}`)).json;
t("failed payment → failed/cancelled, stock released, not decremented", ord.payment.status === "failed" && ord.status === "cancelled" && (await stockNow()) === 2 && (await guest.call("POST", "/api/cart/validate", { lines: [line(2)] })).json.lines[0].ok === true, ord.payment);
// retry with the SAME key after a failure must create a fresh order, not hand back the failed one
r = await checkout(guest, [line(1)], key1);
t("same key after a paid order returns the paid order", r.json.orderId === o1.orderId);
const keyR = randomUUID();
r = await checkout(guest, [line(1)], keyR); const oR1 = r.json; made.push(oR1.orderId);
await hook(guest, evt(oR1, "failed"));
r = await checkout(guest, [line(1)], keyR); made.push(r.json.orderId);
t("retry after failed payment with same key makes a new order that can be paid", r.status === 200 && r.json.orderId !== oR1.orderId && r.json.redirectUrl.includes("/checkout/sandbox/"), r);
await hook(guest, evt(r.json, "failed"));
// cancelled
r = await checkout(guest, [line(1)]); const o3 = r.json; made.push(o3.orderId);
await hook(guest, evt(o3, "cancelled"));
t("cancelled payment recorded", (await guest.call("GET", `/api/orders/${o3.orderId}?t=${o3.token}`)).json.payment.status === "cancelled");
// pay page API (sandbox) goes through the same webhook
r = await checkout(guest, [line(1)]); const o4 = r.json; made.push(o4.orderId);
t("sandbox page needs the order token", (await guest.call("POST", `/api/payments/sandbox/${o4.orderId}`, { outcome: "pay", t: "wrong" })).status === 404);
r = await guest.call("POST", `/api/payments/sandbox/${o4.orderId}`, { outcome: "pay", t: o4.token });
t("sandbox pay → paid via webhook", r.json.outcome === "paid" && (await stockNow()) === 1, r.json);
r = await guest.call("POST", `/api/payments/sandbox/${o4.orderId}`, { outcome: "pay", t: o4.token, eventId: r.json.eventId });
t("sandbox duplicate delivery ignored", r.json.outcome === "duplicate-ignored");
t("retry payment on a paid order refused", (await guest.call("POST", `/api/orders/${o4.orderId}/pay`, { t: o4.token })).status === 409);

// concurrency: stock is 1; 6 simultaneous checkouts → exactly 1 may succeed
const results = await Promise.all(Array.from({ length: 6 }, () => checkout(new Client(), [line(1)])));
const winners = results.filter((x) => x.status === 200);
winners.forEach((w) => made.push(w.json.orderId));
t("6 concurrent checkouts for 1 unit: exactly 1 succeeds", winners.length === 1 && results.filter((x) => x.status === 409).length === 5, results.map((x) => x.status));
await hook(guest, evt(winners[0].json, "paid", { amount: (await guest.call("GET", `/api/orders/${winners[0].json.orderId}?t=${winners[0].json.token}`)).json.totals.total }));
t("stock ends at exactly 0 (never negative)", (await stockNow()) === 0);
// paid but stock gone: pay an order whose stock vanished
await setStock(1);
r = await checkout(guest, [line(1)]); const o5 = r.json; made.push(o5.orderId);
await setStock(0); // admin removes stock while the payment is in flight
const tot5 = (await guest.call("GET", `/api/orders/${o5.orderId}?t=${o5.token}`)).json.totals.total;
r = await hook(guest, evt(o5, "paid", { amount: tot5 }));
ord = (await guest.call("GET", `/api/orders/${o5.orderId}?t=${o5.token}`)).json;
t("paid with no stock left → flagged, stock not negative", r.json.outcome === "paid-without-stock" && ord.refundRequired === true && ord.status === "needs_attention" && (await stockNow()) === 0, r.json);

// ---------- 5. signed-in orders ----------
await setStock(3);
const buyer = new Client(); await buyer.call("POST", "/api/auth/login", { email, password: newPw });
r = await checkout(buyer, [line(1)], randomUUID(), { customer: { email, name: "E2E", phone: "" }, saveAddress: true }); const o6 = r.json; made.push(o6.orderId);
await hook(guest, evt(o6, "paid", { amount: (await buyer.call("GET", `/api/orders/${o6.orderId}`)).json.totals.total }));
r = await buyer.call("GET", "/api/account/orders");
t("signed-in order appears in history (no token needed)", r.json.orders.some((o) => o.id === o6.orderId && o.payment.status === "paid"));
t("history hides internal notes", r.json.orders.every((o) => !("notes" in o)));
t("another account cannot open it", (await new Client().call("GET", `/api/orders/${o6.orderId}`)).status === 404);
t("guest orders are not in the account", !r.json.orders.some((o) => o.id === o1.orderId));
t("checkout saved the address", (await buyer.call("GET", "/api/account/addresses")).json.addresses.length >= 1);

// ---------- 6. admin orders ----------
t("admin API needs sign-in", (await guest.call("GET", "/api/admin/orders")).status === 401);
r = await admin.call("GET", "/api/admin/orders?q=" + o6.orderId);
t("search by order id", r.json.total === 1 && r.json.orders[0].id === o6.orderId);
r = await admin.call("GET", "/api/admin/orders?q=" + encodeURIComponent(email));
t("search by email", r.json.orders.some((o) => o.id === o6.orderId));
r = await admin.call("GET", "/api/admin/orders?payment=paid&status=processing");
t("filter by payment and status", r.json.orders.length > 0 && r.json.orders.every((o) => o.payment.status === "paid" && o.status === "processing"));
r = await admin.call("PATCH", `/api/admin/orders/${o6.orderId}`, { status: "delivered" });
t("invalid transition refused", r.status === 409);
r = await admin.call("PATCH", `/api/admin/orders/${o6.orderId}`, { status: "shipped", tracking: "TRACK123", note: "Packed by test" });
t("fulfilment update", r.status === 200 && r.json.status === "shipped" && r.json.tracking === "TRACK123" && r.json.notes.length === 1, r.json);
t("customer sees tracking, not notes", (await buyer.call("GET", `/api/orders/${o6.orderId}`)).json.tracking === "TRACK123" && !("notes" in (await buyer.call("GET", `/api/orders/${o6.orderId}`)).json));
r = await admin.call("PATCH", `/api/admin/orders/${o3.orderId}`, { status: "processing" });
t("unpaid order cannot be fulfilled", r.status === 409);
r = await editor.call("PATCH", `/api/admin/orders/${o6.orderId}`, { status: "delivered" });
t("editor can update fulfilment", r.status === 200);
t("editor cannot delete orders", (await editor.call("DELETE", `/api/admin/orders/${o6.orderId}`)).status === 403);
const before = await stockNow();
await setStock(5); const s5 = await stockNow();
r = await checkout(guest, [line(1)]); const o7 = r.json; made.push(o7.orderId);
await hook(guest, evt(o7, "paid", { amount: (await guest.call("GET", `/api/orders/${o7.orderId}?t=${o7.token}`)).json.totals.total }));
t("stock decremented for o7", (await stockNow()) === s5 - 1);
r = await admin.call("PATCH", `/api/admin/orders/${o7.orderId}`, { status: "cancelled" });
t("cancelling a paid order restores stock and flags refund", r.json.refundRequired === true && (await stockNow()) === s5, r.json);
r = await admin.call("PATCH", `/api/admin/orders/${o7.orderId}`, { status: "processing" });
t("cancelled order is final", r.status === 409);
// cleanup
for (const id of made) await admin.call("DELETE", `/api/admin/orders/${id}`);
await setStock(origStock);
t("stock restored", (await stockNow()) === origStock, { now: await stockNow(), origStock });
t("test orders removed", (await admin.call("GET", "/api/admin/orders?q=" + encodeURIComponent("buyer@example.com"))).json.orders.every((o) => !made.includes(o.id)));
console.log(`commerce e2e: ${pass} passed, ${failN} failed`);
process.exit(failN ? 1 : 0);
