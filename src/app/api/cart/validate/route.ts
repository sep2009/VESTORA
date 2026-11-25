import { z } from "zod";
import { cartLineInput, COUNTRY_CODES } from "@/modules/commerce/types";
import { apiRoute, errors } from "@/server/commerce/http";
import { quote } from "@/server/commerce/orders";
import { activeProvider } from "@/server/payments";
import { ok, readStore } from "@/server/store/db";

export const dynamic = "force-dynamic";
const input = z.object({ lines: z.array(cartLineInput.partial({ quantity: true }).extend({ quantity: z.number().int().min(1).max(99) })).max(50), country: z.enum(COUNTRY_CODES).optional(), method: z.string().max(30).optional() });

/** Prices and checks cart lines against the database (price, variant, stock, who sells it). The cart UI and every checkout step use this. */
export const POST = (req: Request) => apiRoute(req, { rate: { name: "cart-validate", max: 120, windowMs: 60_000 } }, async ({ body }) => {
  const p = input.safeParse(body);
  if (!p.success) return errors(400, "Invalid cart");
  const provider = activeProvider();
  const q = quote((await readStore()).data, p.data.lines.map((l) => ({ ...l, quantity: Math.min(20, l.quantity), sku: l.sku ?? null, size: l.size ?? null, color: l.color ?? null })), p.data.country ?? null, p.data.method ?? null, provider?.test ?? false);
  return ok({
    lines: q.checks.map((c) => ({ ...c.input, ok: c.ok, issues: c.issues, maxQuantity: c.maxQuantity ?? null, product: c.product ?? null, options: c.options ?? [], unitRegular: c.line?.unitRegular ?? null, unitPrice: c.line?.unitPrice ?? null, currency: c.currency ?? null })),
    shippingOptions: q.shippingOptions, totals: q.totals, errors: q.errors, payments: provider ? { provider: provider.id, label: provider.label, test: provider.test } : null,
  });
});
