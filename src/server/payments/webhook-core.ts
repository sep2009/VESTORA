import { createHmac, timingSafeEqual } from "node:crypto";

/** Dependency-free webhook helpers (no framework imports), so they can be tested on their own. */
export class WebhookError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

/** Normalised payment outcome. Only a verified "paid" event ever marks an order paid. */
export type PaymentEventIn = {
  /** Provider's unique event id; used to ignore duplicate deliveries. */
  id: string;
  type: "paid" | "failed" | "cancelled" | "pending" | "expired";
  orderId: string;
  providerRef: string | null;
  /** Amount and currency the provider says it collected (minor units); checked against the order. */
  amount: number | null;
  currency: string | null;
};

const TOLERANCE_SECONDS = 300;

/** Verifies a Stripe-Signature header ("t=...,v1=...") over `${t}.${rawBody}` with the endpoint secret. */
export function verifyStripeSignature(raw: string, header: string | null, secret: string, now = Date.now()): void {
  if (!header) throw new WebhookError("Missing Stripe-Signature", 400);
  const items = header.split(",").map((p) => p.trim());
  const t = items.find((p) => p.startsWith("t="))?.slice(2);
  const v1 = items.filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!t || v1.length === 0) throw new WebhookError("Malformed Stripe-Signature", 400);
  if (!Number.isFinite(Number(t)) || Math.abs(now / 1000 - Number(t)) > TOLERANCE_SECONDS) throw new WebhookError("Signature timestamp outside tolerance", 400);
  const expected = createHmac("sha256", secret).update(`${t}.${raw}`).digest();
  const ok = v1.some((sig) => { const b = Buffer.from(sig, "hex"); return b.length === expected.length && timingSafeEqual(b, expected); });
  if (!ok) throw new WebhookError("Invalid signature", 400);
}

type StripeSession = { id: string; client_reference_id?: string | null; payment_status?: string; amount_total?: number | null; currency?: string | null; metadata?: { orderId?: string } };
export type StripeEvent = { id: string; type: string; data: { object: StripeSession } };

/** Maps a verified Stripe event to our normalised event. Unknown types are acknowledged and ignored. */
export function mapStripeEvent(ev: StripeEvent): PaymentEventIn | null {
  const s = ev.data.object;
  const orderId = s.metadata?.orderId ?? s.client_reference_id ?? null;
  if (!orderId) return null;
  const base = { id: ev.id, orderId, providerRef: s.id, amount: s.amount_total ?? null, currency: s.currency ? s.currency.toUpperCase() : null };
  switch (ev.type) {
    case "checkout.session.completed": return { ...base, type: s.payment_status === "paid" ? "paid" : "pending" }; // unpaid = asynchronous method still processing
    case "checkout.session.async_payment_succeeded": return { ...base, type: "paid" };
    case "checkout.session.async_payment_failed": return { ...base, type: "failed" };
    case "checkout.session.expired": return { ...base, type: "expired" };
    default: return null;
  }
}
