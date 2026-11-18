"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ITEM_KINDS, type Brand, type Category, type Collection, type DepartmentMeta } from "@/modules/catalog/types";
import { api } from "./api";
import { Card, Errors, Field, Input, Notice, Select, dangerBtn, smallBtn } from "./kit";

type Props = { categories: Category[]; collections: Collection[]; brands: Brand[]; departments: DepartmentMeta[]; role: "admin" | "editor" };

/** Categories (with the 3D shape they use), collections, brands and department labels. Admins only; the server enforces it. */
export function TaxonomyManager({ categories, collections, brands, departments, role }: Props) {
  const router = useRouter();
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const readOnly = role !== "admin";
  const run = async (fn: () => Promise<{ ok: boolean; errors?: string[] }>, done: string) => {
    setErrors([]); setNotice(null);
    const r = await fn();
    if (r.ok) { setNotice(done); router.refresh(); } else setErrors(r.errors ?? ["Failed"]);
  };
  const [nc, setNc] = useState({ name: "", kind: "tee", parent: "" });
  const [nco, setNco] = useState({ name: "", description: "" });
  const [nb, setNb] = useState({ name: "", demo: false });
  const [edit, setEdit] = useState<Record<string, Record<string, unknown>>>({});
  const val = <T,>(key: string, field: string, base: T): T => (edit[key]?.[field] as T | undefined) ?? base;
  const setv = (key: string, field: string, v: unknown) => setEdit((o) => ({ ...o, [key]: { ...o[key], [field]: v } }));
  const patch = (key: string) => edit[key] ?? {};

  return (
    <div className="space-y-8">
      {readOnly && <p role="note" className="rounded-md border border-line bg-surface p-3 text-sm">You are signed in as an editor: taxonomy is read-only. Ask an admin to change it.</p>}
      <Errors errors={errors} />{notice && <Notice>{notice}</Notice>}

      <Card title="Categories" id="categories">
        <p className="mb-3 text-sm text-mute">The <em>3D shape</em> decides how products of a category are drawn in the mall. Create more categories as needed.</p>
        <ul className="space-y-2">{categories.map((c) => { const k = `cat:${c.slug}`; return (
          <li key={c.slug} className="grid items-end gap-2 sm:grid-cols-[1fr_9rem_9rem_auto_auto]">
            <Field label={`${c.slug}`}><Input value={val(k, "name", c.name)} onChange={(e) => setv(k, "name", e.target.value)} disabled={readOnly} /></Field>
            <Field label="3D shape"><Select value={val(k, "kind", c.kind)} onChange={(e) => setv(k, "kind", e.target.value)} disabled={readOnly}>{ITEM_KINDS.map((x) => <option key={x}>{x}</option>)}</Select></Field>
            <Field label="Parent"><Select value={val(k, "parent", c.parent ?? "")} onChange={(e) => setv(k, "parent", e.target.value || null)} disabled={readOnly}><option value="">—</option>{categories.filter((x) => x.slug !== c.slug).map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}</Select></Field>
            <button className={smallBtn} disabled={readOnly || !edit[k]} onClick={() => run(() => api("PUT", `/api/admin/taxonomy/categories/${c.slug}`, patch(k)), `Saved ${c.slug}`)}>Save</button>
            <button className={dangerBtn} disabled={readOnly} onClick={() => run(() => api("DELETE", `/api/admin/taxonomy/categories/${c.slug}`), `Deleted ${c.slug}`)}>Delete</button>
          </li>); })}</ul>
        <form className="mt-4 grid items-end gap-2 border-t border-line pt-4 sm:grid-cols-[1fr_9rem_9rem_auto]" onSubmit={(e) => { e.preventDefault(); void run(() => api("POST", "/api/admin/taxonomy/categories", { name: nc.name, kind: nc.kind, parent: nc.parent || null }), `Created category ${nc.name}`).then(() => setNc({ name: "", kind: "tee", parent: "" })); }}>
          <Field label="New category"><Input value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} required disabled={readOnly} /></Field>
          <Field label="3D shape"><Select value={nc.kind} onChange={(e) => setNc({ ...nc, kind: e.target.value })} disabled={readOnly}>{ITEM_KINDS.map((x) => <option key={x}>{x}</option>)}</Select></Field>
          <Field label="Parent"><Select value={nc.parent} onChange={(e) => setNc({ ...nc, parent: e.target.value })} disabled={readOnly}><option value="">—</option>{categories.map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}</Select></Field>
          <button className={smallBtn} type="submit" disabled={readOnly}>Add</button>
        </form>
      </Card>

      <Card title="Collections" id="collections">
        <ul className="space-y-2">{collections.map((c) => { const k = `col:${c.slug}`; return (
          <li key={c.slug} className="grid items-end gap-2 sm:grid-cols-[1fr_2fr_auto_auto]">
            <Field label={c.slug}><Input value={val(k, "name", c.name)} onChange={(e) => setv(k, "name", e.target.value)} disabled={readOnly} /></Field>
            <Field label="Description"><Input value={val(k, "description", c.description)} onChange={(e) => setv(k, "description", e.target.value)} disabled={readOnly} /></Field>
            <button className={smallBtn} disabled={readOnly || !edit[k]} onClick={() => run(() => api("PUT", `/api/admin/taxonomy/collections/${c.slug}`, patch(k)), `Saved ${c.slug}`)}>Save</button>
            <button className={dangerBtn} disabled={readOnly} onClick={() => run(() => api("DELETE", `/api/admin/taxonomy/collections/${c.slug}`), `Deleted ${c.slug} (removed from its products)`)}>Delete</button>
          </li>); })}</ul>
        <form className="mt-4 grid items-end gap-2 border-t border-line pt-4 sm:grid-cols-[1fr_2fr_auto]" onSubmit={(e) => { e.preventDefault(); void run(() => api("POST", "/api/admin/taxonomy/collections", nco), `Created collection ${nco.name}`).then(() => setNco({ name: "", description: "" })); }}>
          <Field label="New collection"><Input value={nco.name} onChange={(e) => setNco({ ...nco, name: e.target.value })} required disabled={readOnly} /></Field>
          <Field label="Description"><Input value={nco.description} onChange={(e) => setNco({ ...nco, description: e.target.value })} disabled={readOnly} /></Field>
          <button className={smallBtn} type="submit" disabled={readOnly}>Add</button>
        </form>
      </Card>

      <Card title="Brands" id="brands">
        <ul className="space-y-2">{brands.map((b) => { const k = `brand:${b.slug}`; return (
          <li key={b.slug} className="grid items-end gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
            <Field label={b.slug}><Input value={val(k, "name", b.name)} onChange={(e) => setv(k, "name", e.target.value)} disabled={readOnly} /></Field>
            <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" className="size-4 accent-ink" checked={val(k, "demo", b.demo)} onChange={(e) => setv(k, "demo", e.target.checked)} disabled={readOnly} />Demo brand</label>
            <button className={smallBtn} disabled={readOnly || !edit[k]} onClick={() => run(() => api("PUT", `/api/admin/taxonomy/brands/${b.slug}`, patch(k)), `Saved ${b.slug}`)}>Save</button>
            <button className={dangerBtn} disabled={readOnly} onClick={() => run(() => api("DELETE", `/api/admin/taxonomy/brands/${b.slug}`), `Deleted ${b.slug}`)}>Delete</button>
          </li>); })}</ul>
        <form className="mt-4 grid items-end gap-2 border-t border-line pt-4 sm:grid-cols-[1fr_auto_auto]" onSubmit={(e) => { e.preventDefault(); void run(() => api("POST", "/api/admin/taxonomy/brands", nb), `Created brand ${nb.name}`).then(() => setNb({ name: "", demo: false })); }}>
          <Field label="New brand"><Input value={nb.name} onChange={(e) => setNb({ ...nb, name: e.target.value })} required disabled={readOnly} /></Field>
          <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" className="size-4 accent-ink" checked={nb.demo} onChange={(e) => setNb({ ...nb, demo: e.target.checked })} disabled={readOnly} />Demo brand</label>
          <button className={smallBtn} type="submit" disabled={readOnly}>Add</button>
        </form>
      </Card>

      <Card title="Departments (rooms of the 3D mall)" id="departments">
        <p className="mb-3 text-sm text-mute">The nine rooms are fixed. You can rename them, set a tagline, and hide a department from the mall (its products stay in the shop).</p>
        <ul className="space-y-2">{departments.map((d) => { const k = `dep:${d.slug}`; return (
          <li key={d.slug} className="grid items-end gap-2 sm:grid-cols-[1fr_2fr_auto_auto]">
            <Field label={d.slug}><Input value={val(k, "name", d.name)} onChange={(e) => setv(k, "name", e.target.value)} disabled={readOnly} /></Field>
            <Field label="Tagline"><Input value={val(k, "tagline", d.tagline)} onChange={(e) => setv(k, "tagline", e.target.value)} disabled={readOnly} /></Field>
            <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" className="size-4 accent-ink" checked={val(k, "showInMall", d.showInMall)} onChange={(e) => setv(k, "showInMall", e.target.checked)} disabled={readOnly} />Show in mall</label>
            <button className={smallBtn} disabled={readOnly || !edit[k]} onClick={() => run(() => api("PUT", `/api/admin/departments/${d.slug}`, patch(k)), `Saved ${d.slug}`)}>Save</button>
          </li>); })}</ul>
      </Card>
    </div>
  );
}
