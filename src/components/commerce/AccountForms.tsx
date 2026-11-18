"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addressInput, COUNTRIES } from "@/modules/commerce/types";
import { Button } from "@/components/ui/Button";
import { Errors, Field, Input, Notice, Select } from "@/components/admin/kit";
import { dangerBtn, smallBtn } from "@/components/admin/kit";
import { announceAuthChange, post } from "./auth-client";

export function ProfileForms({ name, phone, email }: { name: string; phone: string; email: string }) {
  const router = useRouter();
  const [p, setP] = useState({ name, phone });
  const [pw, setPw] = useState({ current: "", password: "" });
  const [e1, setE1] = useState<string[]>([]); const [n1, setN1] = useState<string | null>(null);
  const [e2, setE2] = useState<string[]>([]); const [n2, setN2] = useState<string | null>(null);
  const save = async (e: React.FormEvent) => { e.preventDefault(); setE1([]); setN1(null); const r = await post("PUT", "/api/account/profile", p); if (r.ok) { setN1("Profile saved."); announceAuthChange(); router.refresh(); } else setE1(r.errors); };
  const change = async (e: React.FormEvent) => { e.preventDefault(); setE2([]); setN2(null); const r = await post("PUT", "/api/account/password", pw); if (r.ok) { setN2("Password changed. Other devices were signed out."); setPw({ current: "", password: "" }); } else setE2(r.errors); };
  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <form onSubmit={(e) => void save(e)} className="grid content-start gap-4"><h2 className="font-display text-xl">Profile</h2>
        <Field label="Email" hint="Your email is your sign-in and cannot be changed here."><Input value={email} readOnly /></Field>
        <Field label="Full name"><Input autoComplete="name" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} required /></Field>
        <Field label="Phone"><Input type="tel" autoComplete="tel" value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} /></Field>
        <Errors errors={e1} />{n1 && <Notice>{n1}</Notice>}<Button type="submit">Save profile</Button></form>
      <form onSubmit={(e) => void change(e)} className="grid content-start gap-4"><h2 className="font-display text-xl">Change password</h2>
        <Field label="Current password"><Input type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required /></Field>
        <Field label="New password" hint="At least 10 characters."><Input type="password" autoComplete="new-password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} required /></Field>
        <Errors errors={e2} />{n2 && <Notice>{n2}</Notice>}<Button type="submit" variant="secondary">Change password</Button></form>
    </div>
  );
}

type Addr = { id: string; label: string; isDefault: boolean; fullName: string; line1: string; line2: string; city: string; region: string; postalCode: string; country: string; phone: string };
const blank = { label: "", fullName: "", line1: "", line2: "", city: "", region: "", postalCode: "", country: "US", phone: "", isDefault: false };

export function AddressManager({ initial }: { initial: Addr[] }) {
  const router = useRouter();
  const [list, setList] = useState(initial);
  const [form, setForm] = useState<(typeof blank & { id?: string }) | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const refresh = async () => { const r = await fetch("/api/account/addresses"); const d = (await r.json()) as { addresses: Addr[] }; setList(d.addresses); router.refresh(); };
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); if (!form) return; setErrors([]);
    const v = addressInput.safeParse(form);
    if (!v.success) return setErrors(v.error.issues.map((i) => `${String(i.path[0] ?? "address")}: ${i.message}`));
    const r = form.id ? await post("PUT", `/api/account/addresses/${form.id}`, form) : await post("POST", "/api/account/addresses", form);
    if (!r.ok) return setErrors(r.errors);
    setForm(null); await refresh();
  };
  const remove = async (id: string) => { if (!window.confirm("Delete this address?")) return; await post("DELETE", `/api/account/addresses/${id}`); await refresh(); };
  const set = (p: Partial<typeof blank>) => setForm((f) => (f ? { ...f, ...p } : f));
  return (
    <div className="space-y-6">
      {list.length === 0 && !form && <p className="text-sm text-mute">No saved addresses yet.</p>}
      <ul className="grid gap-4 sm:grid-cols-2">{list.map((a) => (
        <li key={a.id} className="rounded-md border border-line p-4 text-sm">
          <p className="mb-1 text-xs uppercase tracking-[0.14em] text-mute">{a.label || "Address"}{a.isDefault ? " · default" : ""}</p>
          <address className="not-italic">{a.fullName}<br />{a.line1}{a.line2 ? <><br />{a.line2}</> : null}<br />{a.postalCode} {a.city}{a.region ? `, ${a.region}` : ""}<br />{a.country}</address>
          <div className="mt-3 flex gap-2"><button type="button" className={smallBtn} onClick={() => setForm({ ...a })}>Edit</button><button type="button" className={dangerBtn} onClick={() => void remove(a.id)}>Delete</button></div>
        </li>))}</ul>
      {!form && <Button variant="secondary" onClick={() => setForm({ ...blank })}>Add an address</Button>}
      {form && (
        <form onSubmit={(e) => void save(e)} className="grid max-w-xl gap-4 rounded-md border border-line p-5"><h2 className="font-display text-xl">{form.id ? "Edit address" : "New address"}</h2>
          <Field label="Label (home, work…)"><Input value={form.label} onChange={(e) => set({ label: e.target.value })} /></Field>
          <Field label="Full name"><Input autoComplete="name" value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} required /></Field>
          <Field label="Address"><Input autoComplete="address-line1" value={form.line1} onChange={(e) => set({ line1: e.target.value })} required /></Field>
          <Field label="Apartment, suite (optional)"><Input autoComplete="address-line2" value={form.line2} onChange={(e) => set({ line2: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City"><Input value={form.city} onChange={(e) => set({ city: e.target.value })} required /></Field>
            <Field label="State / province"><Input value={form.region} onChange={(e) => set({ region: e.target.value })} /></Field>
            <Field label="Postal code"><Input value={form.postalCode} onChange={(e) => set({ postalCode: e.target.value })} required /></Field>
            <Field label="Country"><Select value={form.country} onChange={(e) => set({ country: e.target.value })}>{COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</Select></Field>
          </div>
          <Field label="Phone (optional)"><Input type="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-ink" checked={form.isDefault} onChange={(e) => set({ isDefault: e.target.checked })} />Make this my default address</label>
          <Errors errors={errors} />
          <div className="flex gap-3"><Button type="submit">Save address</Button><Button variant="secondary" onClick={() => { setForm(null); setErrors([]); }}>Cancel</Button></div>
        </form>
      )}
    </div>
  );
}
