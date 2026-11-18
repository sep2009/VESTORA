"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ORDER_STATUSES } from "@/modules/commerce/types";
import { orderStatusLabel } from "@/components/commerce/OrderSummary";
import { api } from "./api";
import { Card, dangerBtn, Errors, Field, Input, Notice, Select, smallBtn, Textarea } from "./kit";

const NEXT: Record<string, string[]> = { processing: ["packed", "shipped", "cancelled"], packed: ["shipped", "processing", "cancelled"], shipped: ["delivered"], needs_attention: ["processing", "cancelled"], awaiting_payment: ["cancelled"], delivered: [], cancelled: [] };

/** Fulfilment status, tracking, notes and (for unpaid or test orders) deletion. The server enforces every rule again. */
export function OrderActions({ id, status, paymentStatus, tracking, canDelete, canWrite }: { id: string; status: string; paymentStatus: string; tracking: string; canDelete: boolean; canWrite: boolean }) {
  const router = useRouter();
  const [to, setTo] = useState("");
  const [track, setTrack] = useState(tracking);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const options = (NEXT[status] ?? []).filter((s) => s === "cancelled" || paymentStatus === "paid");
  const save = async () => {
    setErrors([]); setMsg(null);
    const body: Record<string, string> = {};
    if (to) body.status = to;
    if (track !== tracking) body.tracking = track;
    if (note.trim()) body.note = note;
    if (Object.keys(body).length === 0) return setMsg("Nothing to change.");
    if (to === "cancelled" && !window.confirm(paymentStatus === "paid" ? "Cancel this PAID order? Stock is restored and it is flagged for a refund." : "Cancel this order and release its stock?")) return;
    const r = await api("PATCH", `/api/admin/orders/${id}`, body);
    if (!r.ok) return setErrors(r.errors);
    setMsg("Saved."); setTo(""); setNote(""); router.refresh();
  };
  const remove = async () => {
    if (!window.confirm("Delete this order record permanently?")) return;
    const r = await api("DELETE", `/api/admin/orders/${id}`);
    if (r.ok) { router.push("/admin/orders"); router.refresh(); } else setErrors(r.errors);
  };
  if (!canWrite) return <Card title="Manage"><p className="text-sm text-mute">Your role cannot change orders.</p></Card>;
  return (
    <Card title="Manage order">
      <div className="grid gap-4">
        <Field label="Order status" hint={`Now: ${orderStatusLabel(status)}. Only paid orders can be fulfilled.`}>
          <Select value={to} onChange={(e) => setTo(e.target.value)}><option value="">Keep as is</option>{options.map((s) => <option key={s} value={s}>{orderStatusLabel(s)}</option>)}</Select>
        </Field>
        <Field label="Tracking number"><Input value={track} onChange={(e) => setTrack(e.target.value)} maxLength={120} /></Field>
        <Field label="Internal note (not shown to the customer)"><Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} /></Field>
        <Errors errors={errors} />{msg && <Notice>{msg}</Notice>}
        <div className="flex flex-wrap gap-2"><button type="button" className={smallBtn} onClick={() => void save()}>Save changes</button>{canDelete && <button type="button" className={dangerBtn} onClick={() => void remove()}>Delete record</button>}</div>
        {!canDelete && <p className="text-xs text-mute">Real paid orders are financial records: cancel them instead of deleting.</p>}
      </div>
    </Card>
  );
}
