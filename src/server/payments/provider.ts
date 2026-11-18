import "server-only";
import type { Order } from "@/modules/commerce/types";
import type { PaymentEventIn } from "./webhook-core";

/** What a payment provider adapter must do. The rest of the system only knows this interface. */
export type PaymentSession = { providerRef: string; redirectUrl: string };

export { WebhookError, type PaymentEventIn } from "./webhook-core";

export interface PaymentProvider {
  id: "stripe" | "sandbox";
  /** True when no real money moves (sandbox, or a Stripe test-mode key). */
  test: boolean;
  label: string;
  createSession(order: Order, urls: { success: string; cancel: string }): Promise<PaymentSession>;
  /** Verifies the signature of the raw body and returns the event, or null for event types we do not act on. Throws WebhookError when verification fails. */
  parseWebhook(rawBody: string, headers: Headers): PaymentEventIn | null;
}
