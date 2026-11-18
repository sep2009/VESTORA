"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Errors } from "@/components/admin/kit";
import { post } from "./auth-client";

const OUTCOMES = [
  { id: "pay", label: "Pay successfully", help: "Sends a signed 'paid' notification." },
  { id: "fail", label: "Fail the payment", help: "Sends a signed 'failed' notification." },
  { id: "cancel", label: "Cancel the payment", help: "Sends a signed 'cancelled' notification." },
  { id: "pending", label: "Leave it pending", help: "Sends 'still processing', like a slow bank transfer." },
] as const;

/** Stand-in for a provider's hosted payment page. Choosing an outcome sends a SIGNED webhook; the order changes only through that. */
export function SandboxPay({ orderId, token, amount, paymentStatus }: { orderId: string; token: string; amount: string; paymentStatus: string }) {
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [last, setLast] = useState<{ eventId: string; outcome: string } | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const send = async (outcome: string, eventId?: string) => {
    setBusy(true); setErrors([]); setInfo(null);
    const r = await post<{ eventId: string; outcome: string }>("POST", `/api/payments/sandbox/${orderId}`, { outcome, eventId, t: token });
    setBusy(false);
    if (!r.ok) return setErrors(r.errors);
    if (eventId) { setInfo(`Duplicate delivery result: ${r.data.outcome}`); return; }
    setLast({ eventId: r.data.eventId, outcome });
    if (outcome !== "pending") window.location.assign(`/checkout/confirmation/${orderId}?t=${encodeURIComponent(token)}${outcome === "cancel" ? "" : ""}`);
    else setInfo("Marked as pending. Open the confirmation page to see the waiting state.");
  };
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <p role="note" className="mb-6 rounded-sm bg-accent/30 p-4 text-sm"><strong className="uppercase tracking-[0.14em]">Test payment page.</strong> This is not a real payment provider and no money moves. It exists to test the order flow.</p>
      <h1 className="font-display text-3xl">Pay {amount}</h1>
      <p className="mt-1 text-sm text-mute">Order {orderId} · current payment status: {paymentStatus}</p>
      <div className="mt-6 space-y-3">
        {OUTCOMES.map((o) => (
          <div key={o.id} className="flex items-center justify-between gap-4 rounded-sm border border-line p-3">
            <span className="text-sm"><strong className="block">{o.label}</strong><span className="text-xs text-mute">{o.help}</span></span>
            <Button size="sm" variant={o.id === "pay" ? "primary" : "secondary"} disabled={busy} onClick={() => void send(o.id)}>Choose</Button>
          </div>
        ))}
      </div>
      {last && <div className="mt-4 rounded-sm border border-line p-3 text-sm"><p>Event <code>{last.eventId}</code> was delivered ({last.outcome}).</p><Button size="sm" variant="secondary" className="mt-2" disabled={busy} onClick={() => void send(last.outcome, last.eventId)}>Deliver the same event again (duplicate test)</Button></div>}
      {info && <p role="status" className="mt-3 text-sm">{info}</p>}
      <div className="mt-4"><Errors errors={errors} /></div>
      <p className="mt-6 text-sm"><a className="underline" href={`/checkout/confirmation/${orderId}?t=${encodeURIComponent(token)}&cancelled=1`}>Leave without paying</a></p>
    </div>
  );
}
