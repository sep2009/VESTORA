import "server-only";
import type { Order } from "@/modules/commerce/types";
import type { PaymentProvider } from "./provider";
import { mapStripeEvent, verifyStripeSignature, WebhookError, type StripeEvent } from "./webhook-core";

/**
 * Stripe Checkout (hosted page). Card data never touches this server.
 * NOT TESTED against Stripe: it needs STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET from a Stripe account.
 */
export function stripeProvider(secretKey: string, webhookSecret: string): PaymentProvider {
  return {
    id: "stripe", label: "Card (Stripe)", test: secretKey.startsWith("sk_test_"),
    async createSession(order: Order, urls) {
      const form = new URLSearchParams();
      form.set("mode", "payment");
      form.set("client_reference_id", order.id);
      form.set("metadata[orderId]", order.id);
      form.set("customer_email", order.customer.email);
      form.set("success_url", urls.success);
      form.set("cancel_url", urls.cancel);
      form.set("expires_at", String(Math.floor(Date.now() / 1000) + 31 * 60));
      let i = 0;
      const item = (name: string, unit: number, qty: number) => {
        form.set(`line_items[${i}][quantity]`, String(qty));
        form.set(`line_items[${i}][price_data][currency]`, order.totals.currency.toLowerCase());
        form.set(`line_items[${i}][price_data][unit_amount]`, String(unit));
        form.set(`line_items[${i}][price_data][product_data][name]`, name);
        i++;
      };
      for (const l of order.lines) { const opts = [l.size, l.color].filter(Boolean).join(", "); item(opts ? `${l.name} (${opts})` : l.name, l.unitPrice, l.quantity); }
      if (order.totals.shipping > 0) item(`Shipping: ${order.shippingMethod.label}`, order.totals.shipping, 1);
      const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST", headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": `${order.id}:${order.payment.providerRef ?? "new"}` }, body: form,
      });
      const json = (await res.json().catch(() => ({}))) as { id?: string; url?: string; error?: { message?: string } };
      if (!res.ok || !json.id || !json.url) throw new Error(json.error?.message ?? `Stripe returned ${res.status}`);
      return { providerRef: json.id, redirectUrl: json.url };
    },
    parseWebhook(raw, headers) {
      verifyStripeSignature(raw, headers.get("stripe-signature"), webhookSecret);
      let ev: StripeEvent;
      try { ev = JSON.parse(raw) as StripeEvent; } catch { throw new WebhookError("Body is not JSON"); }
      return mapStripeEvent(ev);
    },
  };
}
