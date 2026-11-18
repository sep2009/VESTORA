import { z } from "zod";
import { money } from "@/modules/catalog/types";

/** Countries Vestora ships to. Add a country here and in shipping.ts to open it. */
export const COUNTRIES = [
  { code: "US", name: "United States" }, { code: "CA", name: "Canada" }, { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" }, { code: "FR", name: "France" }, { code: "NL", name: "Netherlands" },
] as const;
export const COUNTRY_CODES = COUNTRIES.map((c) => c.code) as [string, ...string[]];

const text = (max: number) => z.string().trim().min(1, "Required").max(max);
export const email = z.string().trim().toLowerCase().max(200).pipe(z.email("Enter a valid email address"));
export const phone = z.string().trim().max(30).regex(/^[0-9+()\-\s.]{6,30}$/, "Enter a valid phone number").or(z.literal(""));

/** Postal code rules per country. Loose on purpose (they reject typos, not unusual real codes). */
const POSTAL: Record<string, RegExp> = {
  US: /^\d{5}(-\d{4})?$/, CA: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/, GB: /^[A-Za-z]{1,2}\d[A-Za-z\d]? ?\d[A-Za-z]{2}$/,
  DE: /^\d{5}$/, FR: /^\d{5}$/, NL: /^\d{4} ?[A-Za-z]{2}$/,
};

export const addressInput = z.object({
  fullName: text(120),
  line1: text(160),
  line2: z.string().trim().max(160).default(""),
  city: text(100),
  region: z.string().trim().max(100).default(""),
  postalCode: text(12),
  country: z.enum(COUNTRY_CODES, "Choose a country we ship to"),
  phone,
}).superRefine((a, ctx) => {
  const re = POSTAL[a.country];
  if (re && !re.test(a.postalCode)) ctx.addIssue({ code: "custom", path: ["postalCode"], message: `Enter a valid ${a.country} postal code` });
  if ((a.country === "US" || a.country === "CA") && !a.region) ctx.addIssue({ code: "custom", path: ["region"], message: "State or province is required" });
});
export type AddressInput = z.infer<typeof addressInput>;

export const savedAddress = addressInput.and(z.object({ id: z.string().min(4).max(40), label: z.string().trim().max(40).default(""), isDefault: z.boolean().default(false) }));
export type SavedAddress = z.infer<typeof savedAddress>;

export const user = z.object({
  id: z.string(), email: z.string(), name: z.string().max(120), phone: z.string().max(30).default(""),
  passwordHash: z.string(),
  /** Bumped when the password changes; sessions carry it, so a password change signs out every device. */
  passwordVersion: z.number().int().default(1),
  addresses: z.array(savedAddress).max(20).default([]),
  favorites: z.array(z.string()).max(500).default([]),
  createdAt: z.string(),
  failedLogins: z.number().int().default(0),
  lockedUntil: z.number().nullable().default(null),
});
export type User = z.infer<typeof user>;

export const resetToken = z.object({ hash: z.string(), userId: z.string(), expiresAt: z.number(), used: z.boolean().default(false) });
export type ResetToken = z.infer<typeof resetToken>;

export const PAYMENT_STATUSES = ["pending", "paid", "failed", "cancelled", "expired"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export const ORDER_STATUSES = ["awaiting_payment", "processing", "packed", "shipped", "delivered", "cancelled", "needs_attention"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const orderLine = z.object({
  productId: z.string(), slug: z.string(), name: z.string(), brandName: z.string(), image: z.string().nullable(),
  sku: z.string(), size: z.string().nullable(), color: z.string().nullable(), quantity: z.number().int().min(1).max(20),
  /** Prices at purchase time, in minor units. unitRegular is the list price; unitPrice is what was charged (sale price when on sale). */
  unitRegular: z.number().int().nonnegative(), unitPrice: z.number().int().nonnegative(),
  demo: z.boolean(),
});
export type OrderLine = z.infer<typeof orderLine>;

export const orderTotals = z.object({ currency: z.string().length(3), subtotalRegular: z.number().int(), discount: z.number().int(), subtotal: z.number().int(), shipping: z.number().int(), total: z.number().int() });
export type OrderTotals = z.infer<typeof orderTotals>;

export const order = z.object({
  id: z.string(),
  /** Browser-supplied key: submitting the same checkout twice returns the same order instead of a second one. */
  idempotencyKey: z.string().nullable().default(null),
  userId: z.string().nullable(),
  customer: z.object({ email: z.string(), name: z.string(), phone: z.string().default("") }),
  shippingAddress: z.unknown().transform((v) => v as AddressInput),
  shippingMethod: z.object({ id: z.string(), label: z.string(), price: z.number().int(), estimate: z.string() }),
  lines: z.array(orderLine).min(1),
  totals: orderTotals,
  payment: z.object({
    provider: z.string(), providerRef: z.string().nullable(), status: z.enum(PAYMENT_STATUSES),
    /** True only for the sandbox/test provider: no money moved. */
    test: z.boolean(), paidAt: z.string().nullable(), note: z.string().nullable().default(null),
  }),
  status: z.enum(ORDER_STATUSES),
  /** Stock is held for this order until this time while payment is pending. */
  reservedUntil: z.number().nullable(),
  stockCommitted: z.boolean().default(false),
  refundRequired: z.boolean().default(false),
  tracking: z.string().max(120).nullable().default(null),
  notes: z.array(z.object({ at: z.string(), by: z.string(), text: z.string() })).default([]),
  history: z.array(z.object({ at: z.string(), event: z.string() })).default([]),
  createdAt: z.string(), updatedAt: z.string(),
});
export type Order = z.infer<typeof order>;

export const paymentEvent = z.object({ key: z.string(), provider: z.string(), orderId: z.string().nullable(), type: z.string(), at: z.string(), outcome: z.string() });
export type PaymentEvent = z.infer<typeof paymentEvent>;

export const cartLineInput = z.object({
  productId: z.string().min(1).max(80), sku: z.string().max(60).nullable().default(null),
  size: z.string().max(20).nullable().default(null), color: z.string().max(40).nullable().default(null),
  quantity: z.number().int().min(1).max(20),
});
export type CartLineInput = z.infer<typeof cartLineInput>;

export const checkoutInput = z.object({
  lines: z.array(cartLineInput).min(1, "Your cart is empty").max(50),
  customer: z.object({ email, name: text(120), phone }),
  shippingAddress: addressInput,
  shippingMethod: z.string().min(1).max(30),
  /** Idempotency key from the browser: submitting twice (double click, retry) returns the same order. */
  idempotencyKey: z.string().min(8).max(80),
  saveAddress: z.boolean().default(false),
});
export type CheckoutInput = z.infer<typeof checkoutInput>;
export { money };
