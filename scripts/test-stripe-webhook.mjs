// Offline check of the Stripe webhook verification and event mapping (no Stripe account needed).
// Run: node scripts/test-stripe-webhook.mjs
import { createHmac } from "node:crypto";
import { mapStripeEvent, verifyStripeSignature, WebhookError } from "../src/server/payments/webhook-core.ts";

let pass = 0, failN = 0;
const t = (name, cond) => { if (cond) pass++; else { failN++; console.log("FAIL", name); } };
const throwsWith = (fn, msg) => { try { fn(); return false; } catch (e) { return e instanceof WebhookError && e.message.includes(msg); } };

const secret = "whsec_test_secret_value";
const body = JSON.stringify({ id: "evt_1", type: "checkout.session.completed", data: { object: { id: "cs_1", payment_status: "paid", amount_total: 12345, currency: "usd", metadata: { orderId: "VST-ABC" } } } });
const now = Date.now(), ts = Math.floor(now / 1000);
const sign = (raw, s = secret, tt = ts) => `t=${tt},v1=${createHmac("sha256", s).update(`${tt}.${raw}`).digest("hex")}`;

t("valid signature accepted", !throwsWith(() => verifyStripeSignature(body, sign(body), secret, now), ""));
t("missing header rejected", throwsWith(() => verifyStripeSignature(body, null, secret, now), "Missing"));
t("tampered body rejected", throwsWith(() => verifyStripeSignature(body + " ", sign(body), secret, now), "Invalid"));
t("wrong secret rejected", throwsWith(() => verifyStripeSignature(body, sign(body, "other"), secret, now), "Invalid"));
t("old timestamp rejected (replay)", throwsWith(() => verifyStripeSignature(body, sign(body, secret, ts - 3600), secret, now), "tolerance"));
t("malformed header rejected", throwsWith(() => verifyStripeSignature(body, "garbage", secret, now), "Malformed"));
t("rotation: second v1 accepted", !throwsWith(() => verifyStripeSignature(body, `${sign(body, "old")},v1=${sign(body).split("v1=")[1]}`, secret, now), ""));

const ev = JSON.parse(body);
const m = mapStripeEvent(ev);
t("completed+paid → paid with amount, currency, order", m?.type === "paid" && m.amount === 12345 && m.currency === "USD" && m.orderId === "VST-ABC" && m.providerRef === "cs_1");
t("completed+unpaid → pending", mapStripeEvent({ ...ev, data: { object: { ...ev.data.object, payment_status: "unpaid" } } })?.type === "pending");
t("async succeeded → paid", mapStripeEvent({ ...ev, type: "checkout.session.async_payment_succeeded" })?.type === "paid");
t("async failed → failed", mapStripeEvent({ ...ev, type: "checkout.session.async_payment_failed" })?.type === "failed");
t("expired → expired", mapStripeEvent({ ...ev, type: "checkout.session.expired" })?.type === "expired");
t("other events ignored", mapStripeEvent({ ...ev, type: "charge.refunded" }) === null);
t("no order id ignored", mapStripeEvent({ ...ev, data: { object: { id: "cs_2" } } }) === null);
console.log(`stripe webhook helpers: ${pass} passed, ${failN} failed`);
process.exit(failN ? 1 : 0);
