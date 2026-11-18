"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { addressInput, COUNTRIES, email as emailSchema } from "@/modules/commerce/types";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState, Spinner } from "@/components/feedback/States";
import { Button } from "@/components/ui/Button";
import { Errors, Field, Input, Select } from "@/components/admin/kit";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";
import { useCart } from "@/stores/cart-store";
import { useCheckout, type CheckoutAddress } from "@/stores/checkout-store";
import { useMounted } from "@/lib/use-mounted";
import { post, useMe } from "./auth-client";
import { useCartCheck } from "./cart-check";
import { CartLinesView, CheckStatus, SummaryView } from "./CartView";

const STEPS = ["Cart review", "Your details", "Shipping address", "Shipping method", "Payment"] as const;
type SavedAddress = CheckoutAddress & { id: string; label: string; isDefault: boolean };

/** Multi-step checkout. Each step is validated in the browser for convenience AND again by the server, which is the only authority. */
export function CheckoutFlow() {
  const mounted = useMounted();
  const lines = useCart((s) => s.lines);
  const co = useCheckout();
  const me = useMe();
  const check = useCartCheck(co.address.country || null, co.methodId);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [placing, setPlacing] = useState(false);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState<SavedAddress[]>([]);
  const step = Math.min(co.step, STEPS.length - 1);

  // Signed in: prefill the details and load saved addresses.
  useEffect(() => {
    if (!me) return;
    const s = useCheckout.getState();
    if (!s.customer.email) s.patch({ customer: { email: me.email, name: me.name, phone: s.customer.phone } });
    void fetch("/api/account/addresses").then((r) => r.json()).then((d: { addresses?: SavedAddress[] }) => setSaved(d.addresses ?? [])).catch(() => undefined);
  }, [me]);

  if (!mounted) return <PageShell eyebrow="Checkout" title="Checkout"><Spinner /></PageShell>;
  if (lines.length === 0) return <PageShell eyebrow="Checkout" title="Checkout"><EmptyState title="Nothing to check out" icon="bag" action={<Button href="/shop" variant="secondary">Shop</Button>}>Your cart is empty.</EmptyState></PageShell>;

  const data = check.data;
  const blocked = !data || data.lines.some((l) => !l.ok) || !data.totals;
  const go = (n: number) => { setErrs({}); setServerErrors([]); co.patch({ step: n }); window.scrollTo({ top: 0 }); };

  const next = () => {
    if (step === 0) { if (blocked) return setServerErrors(["Fix or remove the highlighted items first."]); return go(1); }
    if (step === 1) {
      const e: Record<string, string> = {};
      const em = emailSchema.safeParse(co.customer.email); if (!em.success) e.email = "Enter a valid email address";
      if (!co.customer.name.trim()) e.name = "Enter your name";
      if (Object.keys(e).length) return setErrs(e);
      return go(2);
    }
    if (step === 2) {
      const r = addressInput.safeParse(co.address);
      if (!r.success) { const e: Record<string, string> = {}; for (const i of r.error.issues) e[String(i.path[0] ?? "address")] ??= i.message; return setErrs(e); }
      return go(3);
    }
    if (step === 3) { if (!co.methodId) return setErrs({ method: "Choose a shipping method" }); return go(4); }
  };

  const place = async () => {
    setPlacing(true); setServerErrors([]);
    const payload = { lines: lines.map((l) => ({ productId: l.productId, sku: l.sku, size: l.size, color: l.color, quantity: l.quantity })), customer: co.customer, shippingAddress: co.address, shippingMethod: co.methodId, saveAddress: co.saveAddress };
    const sig = JSON.stringify(payload);
    // Same details → same key, so a double click or retry cannot create two orders. Changed details → a new key.
    const key = co.key?.sig === sig ? co.key.value : crypto.randomUUID();
    if (co.key?.sig !== sig) co.patch({ key: { value: key, sig } });
    const r = await post<{ redirectUrl: string }>("POST", "/api/checkout", { ...payload, idempotencyKey: key });
    if (!r.ok) { setPlacing(false); return setServerErrors(r.errors); }
    window.location.assign(r.data.redirectUrl);
  };

  const row = (label: string, value: string) => <div className="flex justify-between gap-4 text-sm"><dt className="text-mute">{label}</dt><dd className="text-right">{value}</dd></div>;
  const a = co.address, setA = (p: Partial<CheckoutAddress>) => co.patch({ address: { ...a, ...p } });
  const err = (k: string) => errs[k] && <span role="alert" className="mt-1 block text-xs normal-case tracking-normal text-danger">{errs[k]}</span>;

  return (
    <PageShell eyebrow="Checkout" title="Checkout" intro="Five short steps. Stock and prices are re-checked on our server at every step.">
      <nav aria-label="Checkout progress" className="mb-8">
        <ol className="flex flex-wrap gap-x-2 gap-y-2 text-xs uppercase tracking-[0.12em]">
          {[...STEPS, "Confirmation"].map((s, i) => (
            <li key={s} aria-current={i === step ? "step" : undefined} className={cn("flex items-center gap-2 rounded-sm border px-3 py-2", i === step ? "border-ink bg-ink text-paper" : i < step ? "border-ink text-ink" : "border-line text-mute")}>
              <span aria-hidden="true" className="grid size-5 place-items-center rounded-full border border-current text-[10px]">{i < step ? "✓" : i + 1}</span>
              {i < step ? <button type="button" onClick={() => go(i)} className="underline">{s}</button> : s}
            </li>
          ))}
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
        <section aria-labelledby="step-title" className="space-y-6">
          <h2 id="step-title" className="font-display text-2xl">{step + 1}. {STEPS[step]}</h2>

          {step === 0 && (<>
            <CheckStatus loading={check.loading} error={check.error} retry={check.retry} />
            <CartLinesView lines={lines} check={data} editable />
            <p className="text-sm text-mute"><Link href="/cart" className="underline">Open the full cart</Link> to review everything.</p>
          </>)}

          {step === 1 && (<div className="grid max-w-xl gap-4">
            {me === null && <p className="rounded-sm border border-line p-3 text-sm">Have an account? <Link href="/account?next=/checkout" className="underline">Sign in</Link> to use saved addresses and see this order in your history. Or continue as a guest.</p>}
            {me && <p className="rounded-sm border border-line p-3 text-sm text-mute">Signed in as {me.email}. This order will appear in your account.</p>}
            <Field label="Email"><Input type="email" autoComplete="email" value={co.customer.email} onChange={(e) => co.patch({ customer: { ...co.customer, email: e.target.value } })} aria-invalid={!!errs.email} />{err("email")}</Field>
            <Field label="Full name"><Input autoComplete="name" value={co.customer.name} onChange={(e) => co.patch({ customer: { ...co.customer, name: e.target.value } })} aria-invalid={!!errs.name} />{err("name")}</Field>
            <Field label="Phone (optional)"><Input type="tel" autoComplete="tel" value={co.customer.phone} onChange={(e) => co.patch({ customer: { ...co.customer, phone: e.target.value } })} /></Field>
          </div>)}

          {step === 2 && (<div className="grid max-w-xl gap-4">
            {saved.length > 0 && (
              <fieldset className="space-y-2"><legend className="mb-1 text-xs uppercase tracking-[0.14em] text-mute">Saved addresses</legend>
                {saved.map((s) => <label key={s.id} className="flex cursor-pointer items-start gap-3 rounded-sm border border-line p-3 text-sm has-[:checked]:border-ink"><input type="radio" name="saved" className="mt-1 accent-ink" onChange={() => co.patch({ address: { fullName: s.fullName, line1: s.line1, line2: s.line2, city: s.city, region: s.region, postalCode: s.postalCode, country: s.country, phone: s.phone } })} />
                  <span>{s.label && <strong>{s.label} · </strong>}{s.fullName}, {s.line1}{s.line2 ? `, ${s.line2}` : ""}, {s.postalCode} {s.city}, {s.country}</span></label>)}
              </fieldset>
            )}
            <Field label="Full name"><Input autoComplete="shipping name" value={a.fullName} onChange={(e) => setA({ fullName: e.target.value })} />{err("fullName")}</Field>
            <Field label="Address"><Input autoComplete="shipping address-line1" value={a.line1} onChange={(e) => setA({ line1: e.target.value })} />{err("line1")}</Field>
            <Field label="Apartment, suite (optional)"><Input autoComplete="shipping address-line2" value={a.line2} onChange={(e) => setA({ line2: e.target.value })} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="City"><Input autoComplete="shipping address-level2" value={a.city} onChange={(e) => setA({ city: e.target.value })} />{err("city")}</Field>
              <Field label="State / province"><Input autoComplete="shipping address-level1" value={a.region} onChange={(e) => setA({ region: e.target.value })} />{err("region")}</Field>
              <Field label="Postal code"><Input autoComplete="shipping postal-code" value={a.postalCode} onChange={(e) => setA({ postalCode: e.target.value })} />{err("postalCode")}</Field>
              <Field label="Country"><Select autoComplete="shipping country" value={a.country} onChange={(e) => { setA({ country: e.target.value }); co.patch({ methodId: null }); }}>{COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</Select>{err("country")}</Field>
            </div>
            <Field label="Phone for the courier (optional)"><Input type="tel" autoComplete="shipping tel" value={a.phone} onChange={(e) => setA({ phone: e.target.value })} />{err("phone")}</Field>
            {me && <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-ink" checked={co.saveAddress} onChange={(e) => co.patch({ saveAddress: e.target.checked })} />Save this address to my account</label>}
          </div>)}

          {step === 3 && (
            <fieldset className="max-w-xl space-y-3"><legend className="sr-only">Shipping method</legend>
              <CheckStatus loading={check.loading} error={check.error} retry={check.retry} />
              {(data?.shippingOptions ?? []).map((m) => (
                <label key={m.id} className="flex cursor-pointer items-center justify-between gap-4 rounded-sm border border-line p-4 has-[:checked]:border-ink">
                  <span className="flex items-center gap-3"><input type="radio" name="method" className="accent-ink" checked={co.methodId === m.id} onChange={() => co.patch({ methodId: m.id })} /><span><strong className="block text-sm">{m.label}</strong><span className="text-xs text-mute">{m.estimate}</span></span></span>
                  <span className="text-sm">{m.price === 0 ? "Free" : formatMoney({ amount: m.price, currency: data!.totals?.currency ?? "USD" })}</span>
                </label>
              ))}
              {err("method")}
              <p className="text-xs text-mute">Standard shipping is free on orders of 150.00 or more after discounts.</p>
            </fieldset>
          )}

          {step === 4 && (<div className="max-w-xl space-y-5">
            {check.loading && <Spinner label="Checking stock" />}
            {data && !data.payments && <p role="alert" className="rounded-sm border border-danger p-4 text-sm text-danger"><strong>Payments are not configured on this server</strong>, so an order cannot be placed and nothing can be charged. An administrator needs to set up a payment provider (see docs/COMMERCE.md).</p>}
            {data?.payments && (
              <div className="space-y-3 rounded-sm border border-line p-4 text-sm">
                <p><strong>Pay with:</strong> {data.payments.label}</p>
                {data.payments.test
                  ? <p role="note" className="rounded-sm bg-accent/20 p-3"><strong>Test mode. No real money moves.</strong> You will be sent to a test payment page where you choose the outcome (paid, failed, cancelled, pending). The order is only confirmed when that outcome arrives as a signed provider notification.</p>
                  : <p className="text-mute">You will be sent to the payment provider&apos;s secure page to pay. Card details are never entered on or sent to this site.</p>}
              </div>
            )}
            <dl className="space-y-2 rounded-sm border border-line p-4">
              {row("Contact", `${co.customer.name} · ${co.customer.email}`)}
              {row("Ship to", `${a.fullName}, ${a.line1}${a.line2 ? `, ${a.line2}` : ""}, ${a.postalCode} ${a.city}, ${a.country}`)}
              {row("Shipping", data?.shippingOptions.find((m) => m.id === co.methodId)?.label ?? "—")}
            </dl>
            <p className="text-xs text-mute">Your order is held for 30 minutes while you pay. It is confirmed only after the payment provider confirms payment.</p>
          </div>)}

          <Errors errors={serverErrors} />
          <div className="flex flex-wrap gap-3 pt-2">
            {step > 0 && <Button variant="secondary" onClick={() => go(step - 1)} disabled={placing}>Back</Button>}
            {step < 4
              ? <Button onClick={next} disabled={step === 0 && (check.loading || blocked)}>Continue</Button>
              : <Button size="lg" onClick={() => void place()} disabled={placing || !data?.payments || blocked || !co.methodId}>{placing ? "Placing order…" : data?.payments?.test ? "Place order and go to test payment" : "Place order and pay"}</Button>}
          </div>
        </section>

        <aside className="h-fit space-y-4 rounded-md border border-line bg-surface p-5" aria-label="Order summary">
          <h2 className="font-display text-xl">Order summary</h2>
          <CartLinesView lines={lines} check={data} editable={false} compact />
          <SummaryView check={data} shipping={co.methodId ? "included" : "later"} />
        </aside>
      </div>
    </PageShell>
  );
}
