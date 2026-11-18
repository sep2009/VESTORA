"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { DOOR_WIDTH, ZONE_SIZE, getZone, openingsFor } from "@/modules/showroom/layout";
import { ACCEPTS, DISPLAY_TYPES, validateSlots, type SlotRecord } from "@/modules/showroom/slots";
import { api } from "./api";
import { Card, Errors, Input, Notice, Select, dangerBtn, smallBtn } from "./kit";

type P = { id: string; name: string; category: string; showInMall: boolean; placedAt: string | null; pin: string | null };
type Props = { department: string; slots: SlotRecord[]; products: P[]; departments: { slug: string; name: string }[]; role: "admin" | "editor" };

const SIZE: Record<string, [number, number]> = { rack: [2.1, 0.6], mannequin: [0.6, 0.6], platform: [2, 2], shelf: [1.9, 0.45], pedestal: [0.5, 0.5], table: [1.6, 0.9], niche: [1.3, 0.2] };
const PX = 24;

/** Edit the fixtures of one department as data (position, rotation, scale, type, visibility) and pin products to fixtures. The server re-validates everything. */
export function ShowroomEditor({ department, slots: initial, products, departments, role }: Props) {
  const router = useRouter();
  const [slots, setSlots] = useState(initial);
  const [sel, setSel] = useState<string | null>(initial[0]?.id ?? null);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pins, setPins] = useState<Record<string, string | null>>(() => Object.fromEntries(products.map((p) => [p.id, p.pin])));
  const readOnly = role !== "admin";
  const zone = getZone(department as never);
  const o = openingsFor(zone);
  const local = validateSlots(slots);
  const upd = (id: string, patch: Partial<SlotRecord>) => setSlots((a) => a.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const num = (v: string) => (Number.isFinite(Number(v)) ? Number(v) : 0);

  const save = async () => {
    setErrors([]); setNotice(null);
    const r = await api("PUT", `/api/admin/showroom/slots/${department}`, { slots });
    if (r.ok) { setNotice("Fixtures saved. The 3D mall reflects this on its next load."); router.refresh(); } else setErrors(r.errors);
  };
  const add = () => {
    let n = slots.length + 1; while (slots.some((s) => s.id === `${department}-${n}-table`)) n++;
    const s: SlotRecord = { id: `${department}-${n}-table`, department: department as SlotRecord["department"], type: "table", accepts: "any", capacity: 3, x: 0, z: 0, y: 0, rotationDeg: 0, scale: 1, visible: true, glass: false, spin: false };
    setSlots((a) => [...a, s]); setSel(s.id);
  };
  const pin = async (productId: string, slotId: string | null) => {
    setErrors([]); setNotice(null);
    const r = await api("PUT", "/api/admin/showroom/assignment", { productId, slotId });
    if (r.ok) { setPins((m) => ({ ...m, [productId]: slotId })); setNotice(slotId ? "Pinned." : "Pin cleared (automatic placement)."); router.refresh(); } else setErrors(r.errors);
  };
  const w = ZONE_SIZE * PX, c = w / 2;

  return (
    <div className="space-y-8">
      <nav aria-label="Departments" className="flex flex-wrap gap-2">{departments.map((d) => <Link key={d.slug} href={`/admin/showroom?dept=${d.slug}`} aria-current={d.slug === department} className={`rounded-sm border px-3 py-1.5 text-xs uppercase tracking-[0.12em] ${d.slug === department ? "border-ink bg-ink text-paper" : "border-line"}`}>{d.name}</Link>)}</nav>
      {readOnly && <p role="note" className="rounded-md border border-line bg-surface p-3 text-sm">Editors can view the showroom but only admins can change it.</p>}
      <Errors errors={errors} />{notice && <Notice>{notice}</Notice>}

      <Card title={`${zone.name}: floor plan`}>
        <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
          <svg viewBox={`0 0 ${w} ${w}`} width={w} height={w} role="img" aria-label={`Top-down plan of the ${zone.name} room. North is up.`} className="max-w-full rounded-sm border border-line bg-paper">
            <rect x={0} y={0} width={w} height={w} fill="none" stroke="var(--color-ink)" strokeWidth={4} />
            {(["n", "s", "w", "e"] as const).filter((s) => o[s]).map((s) => {
              const len = DOOR_WIDTH * PX, a = c - len / 2;
              return <rect key={s} x={s === "n" || s === "s" ? a : s === "w" ? -2 : w - 6} y={s === "w" || s === "e" ? a : s === "n" ? -2 : w - 6} width={s === "n" || s === "s" ? len : 8} height={s === "w" || s === "e" ? len : 8} fill="var(--color-accent)" />;
            })}
            {slots.map((s) => { const [fw, fd] = SIZE[s.type]!; const x = c + s.x * PX, z = c + s.z * PX; const on = s.id === sel; return (
              <g key={s.id} transform={`translate(${x} ${z}) rotate(${-s.rotationDeg})`} onClick={() => setSel(s.id)} style={{ cursor: "pointer", opacity: s.visible ? 1 : 0.35 }}>
                {s.type === "platform" || s.type === "mannequin" ? <ellipse rx={(fw * PX * s.scale) / 2} ry={(fd * PX * s.scale) / 2} fill={on ? "var(--color-accent)" : "var(--color-surface)"} stroke="var(--color-ink)" strokeWidth={on ? 3 : 1.5} />
                  : <rect x={-(fw * PX * s.scale) / 2} y={-(fd * PX * s.scale) / 2} width={fw * PX * s.scale} height={fd * PX * s.scale} fill={on ? "var(--color-accent)" : "var(--color-surface)"} stroke="var(--color-ink)" strokeWidth={on ? 3 : 1.5} />}
                <line x1={0} y1={0} x2={0} y2={(fd * PX * s.scale) / 2 + 8} stroke="var(--color-ink)" strokeWidth={2} />
                <title>{`${s.id} (${s.type})`}</title>
              </g>); })}
          </svg>
          <div className="text-sm text-mute"><p>North is up. The orange gaps are doorways. A line from a fixture marks the side it faces. Click a fixture to select it.</p>
            {local.length > 0 && <ul role="alert" className="mt-3 list-disc pl-5 text-danger">{local.map((e, i) => <li key={i}>{e}</li>)}</ul>}
            <p className="mt-3"><Link href={`/?dept=${department}`} className="underline">Open this department in the 3D mall</Link></p></div>
        </div>
      </Card>

      <Card title="Fixtures">
        <div className="overflow-x-auto"><table className="w-full min-w-[56rem] text-sm"><thead><tr className="text-left text-xs uppercase tracking-[0.12em] text-mute"><th>Id</th><th>Type</th><th>Takes</th><th>Cap.</th><th>X</th><th>Z</th><th>Height</th><th>Rot°</th><th>Scale</th><th>Visible</th><th /></tr></thead>
          <tbody>{slots.map((s) => (
            <tr key={s.id} className={s.id === sel ? "bg-ink/5" : ""} onClick={() => setSel(s.id)}>
              <td className="py-1 pr-2"><code className="text-xs">{s.id}</code></td>
              <td className="pr-1"><Select aria-label={`${s.id} type`} disabled={readOnly} value={s.type} onChange={(e) => upd(s.id, { type: e.target.value as SlotRecord["type"], capacity: ["mannequin", "platform", "pedestal", "niche"].includes(e.target.value) ? 1 : s.capacity })}>{DISPLAY_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></td>
              <td className="pr-1"><Select aria-label={`${s.id} accepts`} disabled={readOnly} value={s.accepts} onChange={(e) => upd(s.id, { accepts: e.target.value as SlotRecord["accepts"] })}>{ACCEPTS.map((t) => <option key={t}>{t}</option>)}</Select></td>
              <td className="pr-1"><Input aria-label={`${s.id} capacity`} className="w-16" type="number" min={1} max={8} disabled={readOnly} value={s.capacity} onChange={(e) => upd(s.id, { capacity: num(e.target.value) })} /></td>
              <td className="pr-1"><Input aria-label={`${s.id} x`} className="w-20" type="number" step={0.1} disabled={readOnly} value={s.x} onChange={(e) => upd(s.id, { x: num(e.target.value) })} /></td>
              <td className="pr-1"><Input aria-label={`${s.id} z`} className="w-20" type="number" step={0.1} disabled={readOnly} value={s.z} onChange={(e) => upd(s.id, { z: num(e.target.value) })} /></td>
              <td className="pr-1"><Input aria-label={`${s.id} height`} className="w-20" type="number" step={0.1} disabled={readOnly} value={s.y} onChange={(e) => upd(s.id, { y: num(e.target.value) })} /></td>
              <td className="pr-1"><Input aria-label={`${s.id} rotation`} className="w-20" type="number" step={15} disabled={readOnly} value={s.rotationDeg} onChange={(e) => upd(s.id, { rotationDeg: num(e.target.value) })} /></td>
              <td className="pr-1"><Input aria-label={`${s.id} scale`} className="w-20" type="number" step={0.1} disabled={readOnly} value={s.scale} onChange={(e) => upd(s.id, { scale: num(e.target.value) })} /></td>
              <td className="pr-1"><input aria-label={`${s.id} visible`} type="checkbox" className="size-4 accent-ink" disabled={readOnly} checked={s.visible} onChange={(e) => upd(s.id, { visible: e.target.checked })} /></td>
              <td><button className={dangerBtn} disabled={readOnly} onClick={() => setSlots((a) => a.filter((x) => x.id !== s.id))}>×</button></td>
            </tr>))}</tbody></table></div>
        <div className="mt-4 flex gap-3"><Button onClick={save} disabled={readOnly || local.length > 0}>Save fixtures</Button><button className={smallBtn} onClick={add} disabled={readOnly}>Add fixture</button></div>
      </Card>

      <Card title="Product placement">
        <p className="mb-3 text-sm text-mute">Products are placed automatically. Pin a product to a specific fixture to override that. Racks and shelves hold several products; mannequins, plinths and niches hold one.</p>
        {products.length === 0 ? <p className="text-sm text-mute">No products in this department.</p> : (
          <ul className="divide-y divide-line">{products.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 py-2">
              <span className="min-w-48 flex-1 text-sm">{p.name}<span className="block text-xs text-mute">{p.category}{!p.showInMall && " · hidden from mall"}{p.showInMall && p.placedAt && ` · shown at ${p.placedAt}`}{p.showInMall && !p.placedAt && " · not placed (no fitting fixture)"}</span></span>
              <Select aria-label={`Pin ${p.name}`} className="w-64" disabled={readOnly || !p.showInMall} value={pins[p.id] ?? ""} onChange={(e) => void pin(p.id, e.target.value || null)}>
                <option value="">Automatic</option>{slots.filter((s) => s.visible).map((s) => <option key={s.id} value={s.id}>{s.id}</option>)}
              </Select>
            </li>))}</ul>
        )}
      </Card>
    </div>
  );
}
