import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Order } from "@/modules/commerce/types";
import type { PaymentProvider } from "./provider";
import { WebhookError, type PaymentEventIn } from "./webhook-core";

/** Signs a sandbox event body. The sandbox "payment page" uses this to deliver outcomes through the SAME webhook route a real provider would. */
export const signSandbox = (raw: string, secret: string) => createHmac("sha256", secret).update(raw).digest("hex");

/**
 * Test payment provider for development and demos. NO MONEY MOVES. It shows a hosted-style page where the tester
 * chooses an outcome; the outcome reaches the order only as a signed webhook, so the order flow is the real one.
 * Disabled in production unless ALLOW_TEST_PAYMENTS=1.
 */
export function sandboxProvider(secret: string): PaymentProvider {
  return {
    id: "sandbox", label: "Test payment (no real money)", test: true,
    async createSession(order: Order) {
      const providerRef = `sbx_${order.id}_${Date.now().toString(36)}`;
      return { providerRef, redirectUrl: `/checkout/sandbox/${order.id}` };
    },
    parseWebhook(raw, headers) {
      const given = Buffer.from(headers.get("x-sandbox-signature") ?? "", "hex");
      const expected = Buffer.from(signSandbox(raw, secret), "hex");
      if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw new WebhookError("Invalid signature", 400);
      let ev: Partial<PaymentEventIn>;
      try { ev = JSON.parse(raw) as Partial<PaymentEventIn>; } catch { throw new WebhookError("Body is not JSON"); }
      if (!ev.id || !ev.orderId || !["paid", "failed", "cancelled", "pending", "expired"].includes(ev.type ?? "")) throw new WebhookError("Malformed event");
      return { id: ev.id, type: ev.type!, orderId: ev.orderId, providerRef: ev.providerRef ?? null, amount: ev.amount ?? null, currency: ev.currency ?? null };
    },
  };
}
