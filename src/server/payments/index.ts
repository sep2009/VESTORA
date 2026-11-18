import "server-only";
import type { PaymentProvider } from "./provider";
import { sandboxProvider } from "./sandbox";
import { stripeProvider } from "./stripe";

/**
 * Which provider is active, decided only by environment variables:
 *  - STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET  → Stripe Checkout
 *  - otherwise PAYMENT_WEBHOOK_SECRET (and not production, or ALLOW_TEST_PAYMENTS=1) → the test sandbox
 *  - otherwise null: checkout refuses to take orders rather than pretending.
 */
export function activeProvider(): PaymentProvider | null {
  const sk = process.env.STRIPE_SECRET_KEY, wh = process.env.STRIPE_WEBHOOK_SECRET;
  if (sk && wh) return stripeProvider(sk, wh);
  const sandbox = process.env.PAYMENT_WEBHOOK_SECRET;
  if (sandbox && sandbox.length >= 16 && (process.env.NODE_ENV !== "production" || process.env.ALLOW_TEST_PAYMENTS === "1")) return sandboxProvider(sandbox);
  return null;
}
export function providerById(id: string): PaymentProvider | null {
  const p = activeProvider();
  return p && p.id === id ? p : null;
}
