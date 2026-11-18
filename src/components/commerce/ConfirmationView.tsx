"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Order } from "@/modules/commerce/types";
import { PageShell } from "@/components/layout/PageShell";
import { ErrorState, Spinner } from "@/components/feedback/States";
import { Button } from "@/components/ui/Button";
import { Errors } from "@/components/admin/kit";
import { lineKey, useCart } from "@/stores/cart-store";
import { useCheckout } from "@/stores/checkout-store";
import { post } from "./auth-client";
import { OrderSummary } from "./OrderSummary";

const POLL_MS = 2500, POLL_MAX_MS = 3 * 60_000;

/**
 * Shows the order's real status from the server. "Confirmed" appears only when the payment provider's notification has been
 * received and verified; until then the page says it is waiting. The cart is emptied only after a confirmed payment.
 */
export function ConfirmationView({ id, token, cancelledReturn }: { id: string; token: string | null; cancelledReturn: boolean }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [state, setState] = useState<"loading" | "missing" | "ok">("loading");
  const [gaveUp, setGaveUp] = useState(false);
  const [retryErrors, setRetryErrors] = useState<string[]>([]);
  const [retrying, setRetrying] = useState(false);
  const cleared = useRef(false);
  const started = useRef(Date.now());

  const load = useCallback(async () => {
    const r = await fetch(`/api/orders/${encodeURIComponent(id)}${token ? `?t=${encodeURIComponent(token)}` : ""}`, { credentials: "same-origin", cache: "no-store" });
    if (r.status === 404) { setState("missing"); return null; }
    if (!r.ok) return null;
    const o = (await r.json()) as Order;
    setOrder(o); setState("ok");
    return o;
  }, [id, token]);

  useEffect(() => {
    let alive = true, timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      const o = await load();
      if (!alive) return;
      if (o && o.payment.status === "pending") {
        if (Date.now() - started.current > POLL_MAX_MS) { setGaveUp(true); return; }
        timer = setTimeout(tick, POLL_MS);
      }
    };
    void tick();
    return () => { alive = false; clearTimeout(timer); };
  }, [load]);

  // Only a confirmed payment empties the cart.
  useEffect(() => {
    if (!order || order.payment.status !== "paid" || cleared.current) return;
    cleared.current = true;
    useCart.getState().removeMany(order.lines.map((l) => lineKey(l.productId, l.size, l.color)));
    useCheckout.getState().reset();
  }, [order]);

  const retry = async () => {
    setRetrying(true); setRetryErrors([]);
    const r = await post<{ redirectUrl: string }>("POST", `/api/orders/${id}/pay`, { t: token });
    if (!r.ok) { setRetrying(false); return setRetryErrors(r.errors); }
    window.location.assign(r.data.redirectUrl);
  };

  if (state === "loading") return <PageShell eyebrow="Order" title="Checking your order"><Spinner label="Loading your order" /></PageShell>;
  if (state === "missing" || !order) return <PageShell eyebrow="Order" title="Order not found"><ErrorState title="We could not find that order" action={<Button href="/account/orders" variant="secondary">Your orders</Button>}>The link may be incomplete. If you signed in to place the order, open it from your account.</ErrorState></PageShell>;

  const p = order.payment.status;
  const head =
    p === "paid" && order.status === "needs_attention" ? { title: "Payment received. We are checking your order", tone: "warn" as const, text: "Your payment was received, but we need to confirm stock before we can ship. We will contact you at " + order.customer.email + ". You will not be charged twice." }
    : p === "paid" ? { title: "Thank you. Your order is confirmed", tone: "ok" as const, text: `Payment was confirmed by the payment provider. A confirmation will be sent to ${order.customer.email} once email delivery is configured.` }
    : p === "pending" ? { title: cancelledReturn ? "Payment not completed" : "Waiting for payment confirmation", tone: "wait" as const, text: cancelledReturn ? "You came back without finishing payment. Your items are held for a short time. You can try the payment again." : gaveUp ? "We have not heard from the payment provider yet. This page does not confirm anything until we do. Your order stays here and in your account; check back shortly." : "We are waiting for the payment provider to confirm. This page updates by itself. Do not pay again." }
    : p === "failed" ? { title: "The payment failed", tone: "bad" as const, text: "The payment provider reported that the payment failed. The order was not placed and the items were released. Your cart is unchanged, so you can try again." }
    : p === "cancelled" ? { title: "The payment was cancelled", tone: "bad" as const, text: "The payment was cancelled, so the order was not placed. Your cart is unchanged." }
    : { title: "The payment session expired", tone: "bad" as const, text: "The payment was not completed in time and the items were released. Your cart is unchanged." };

  return (
    <PageShell eyebrow={`Order ${order.id}`} title={head.title} intro={head.text}>
      <div className="space-y-8">
        {p === "pending" && !gaveUp && !cancelledReturn && <Spinner label="Waiting for the payment provider" />}
        {order.payment.test && <p role="note" className="rounded-sm bg-accent/20 p-3 text-sm"><strong>Test order.</strong> It used the test payment provider. No money moved and nothing will be shipped.</p>}
        <Errors errors={retryErrors} />
        <div className="flex flex-wrap gap-3">
          {p === "pending" && <Button onClick={() => void retry()} disabled={retrying}>{retrying ? "Opening payment…" : "Pay now"}</Button>}
          {(p === "failed" || p === "cancelled" || p === "expired") && <Button href="/checkout">Try again</Button>}
          <Button href="/cart" variant="secondary">View cart</Button>
          <Button href="/shop" variant="secondary">Keep shopping</Button>
          <Button href="/" variant="secondary">Back to the mall</Button>
        </div>
        <OrderSummary order={order} />
      </div>
    </PageShell>
  );
}
