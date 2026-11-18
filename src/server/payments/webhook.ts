import "server-only";
import { applyPaymentEvent } from "@/server/commerce/orders";
import { providerById } from "./index";
import { WebhookError } from "./provider";

/**
 * The one entry point for provider callbacks (the HTTP route and the sandbox both use it).
 * Verifies the signature BEFORE reading anything else, rejects bad calls, and acknowledges everything it has handled
 * (including duplicates), because providers retry until they get a 2xx.
 */
export async function handleWebhook(providerId: string, raw: string, headers: Headers): Promise<{ status: number; body: Record<string, unknown> }> {
  const provider = providerById(providerId);
  if (!provider) return { status: 404, body: { error: "Unknown or inactive payment provider" } };
  if (raw.length > 1_000_000) return { status: 413, body: { error: "Payload too large" } };
  let event;
  try { event = provider.parseWebhook(raw, headers); }
  catch (e) { return { status: e instanceof WebhookError ? e.status : 400, body: { error: e instanceof Error ? e.message : "Bad webhook" } }; }
  if (!event) return { status: 200, body: { received: true, ignored: true } };
  const r = await applyPaymentEvent(provider, event);
  return r.ok ? { status: 200, body: { received: true, outcome: r.data.outcome } } : { status: r.status, body: { error: r.errors.join("; ") } };
}
