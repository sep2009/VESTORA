"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { AUDIENCES, DEPARTMENTS, type Brand, type Category, type Collection, type DepartmentMeta, type Product } from "@/modules/catalog/types";
import { api, upload } from "./api";
import { Card, Errors, Field, Input, Notice, Select, Textarea, dangerBtn, smallBtn } from "./kit";

type Img = Product["images"][number];
type Var = Product["variants"][number];
type Props = { initial: Product | null; brands: Brand[]; categories: Category[]; collections: Collection[]; departments: DepartmentMeta[]; role: "admin" | "editor" };

const money = (m: { amount: number } | null) => (m ? (m.amount / 100).toFixed(2) : "");
const cents = (s: string) => { const n = Number.parseFloat(s); return Number.isFinite(n) ? Math.round(n * 100) : null; };
const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

/** Create/edit one product: details, price and sale price, images, 3D model, variants and stock. Everything is validated again on the server. */
export function ProductEditor({ initial, brands, categories, collections, departments, role }: Props) {
  const router = useRouter();
  const [p, setP] = useState(initial);
  const [f, setF] = useState(() => ({
    name: initial?.name ?? "", slug: initial?.slug ?? "", brand: initial?.brand ?? brands[0]?.slug ?? "", department: initial?.department ?? "casual",
    category: initial?.category ?? categories[0]?.slug ?? "", audience: initial?.audience ?? "unisex", description: initial?.description ?? "",
    price: money(initial?.price ?? null), currency: initial?.price?.currency ?? "USD", sale: money(initial?.salePrice ?? null),
    tags: (initial?.tags ?? []).join(", "), materials: (initial?.materials ?? []).join(", "), collections: initial?.collections ?? [], featured: initial?.featured ?? false,
    showInMall: initial?.showInMall ?? true, availability: initial?.availability ?? "unknown",
    sourceKind: initial?.source.kind ?? "demo", retailer: initial?.source.retailer ?? "", url: initial?.source.url ?? "", retrievedAt: initial?.source.retrievedAt ?? "",
  }));
  const [images, setImages] = useState<Img[]>(initial?.images ?? []);
  const [model, setModel] = useState<{ url: string; license: string } | null>(initial?.model3d ? { url: initial.model3d.url, license: initial.model3d.license ?? "" } : null);
  const [variants, setVariants] = useState<Var[]>(initial?.variants ?? []);
  const [hex, setHex] = useState<Record<string, string>>(() => Object.fromEntries((initial?.colors ?? []).map((c) => [c.name, c.hex ?? ""])));
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [gen, setGen] = useState({ sizes: "", colors: "", stock: "5" });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((o) => ({ ...o, [k]: v }));
  const isNew = !initial;
  const demo = f.sourceKind === "demo";
  const colorNames = useMemo(() => [...new Set(variants.map((v) => v.color).filter((c): c is string => !!c))], [variants]);

  const payload = () => ({
    name: f.name, ...(f.slug ? { slug: f.slug } : {}), brand: f.brand, department: f.department, category: f.category, audience: f.audience, description: f.description,
    collections: f.collections, tags: list(f.tags), materials: list(f.materials), featured: f.featured, showInMall: f.showInMall,
    images, model3d: model && model.url ? { url: model.url, license: model.license || null } : null,
    price: cents(f.price) === null ? null : { amount: cents(f.price)!, currency: f.currency.toUpperCase() },
    salePrice: f.sale && cents(f.sale) !== null ? { amount: cents(f.sale)!, currency: f.currency.toUpperCase() } : null,
    variants, sizes: null, colors: colorNames.map((n) => ({ name: n, hex: /^#[0-9a-fA-F]{6}$/.test(hex[n] ?? "") ? hex[n]! : null })), colorsVerified: variants.length > 0,
    availability: variants.length ? (variants.some((v) => v.stock > 0) ? "in_stock" : "out_of_stock") : f.availability,
    source: { kind: f.sourceKind, retailer: demo ? null : f.retailer || null, url: demo ? null : f.url || null, retrievedAt: demo ? null : f.retrievedAt || null },
  });

  const save = async () => {
    setBusy(true); setErrors([]); setNotice(null);
    const r = isNew ? await api<Product>("POST", "/api/admin/products", payload()) : await api<Product>("PUT", `/api/admin/products/${initial!.id}`, payload());
    setBusy(false);
    if (!r.ok) return setErrors(r.errors);
    if (isNew) { router.push(`/admin/products/${r.data.id}`); router.refresh(); return; }
    setP(r.data); setVariants(r.data.variants); setNotice(`Saved. Product id ${r.data.id} is unchanged.`); router.refresh();
  };
  const remove = async () => {
    if (!initial || !window.confirm(`Delete "${initial.name}" permanently? It is removed from the shop and the 3D mall.`)) return;
    const r = await api("DELETE", `/api/admin/products/${initial.id}`);
    if (r.ok) { router.push("/admin/products"); router.refresh(); } else setErrors(r.errors);
  };
  const onImage = async (file: File | undefined) => {
    if (!file) return;
    setErrors([]); const r = await upload("image", file);
    if (r.ok) setImages((o) => [...o, { url: r.data.url, alt: f.name ? `${f.name} photo` : file.name, credit: null, license: demo ? "demo" : "" }]); else setErrors(r.errors);
  };
  const onModel = async (file: File | undefined) => {
    if (!file) return;
    setErrors([]); const r = await upload("model", file);
    if (r.ok) setModel({ url: r.data.url, license: demo ? "demo" : "" }); else setErrors(r.errors);
  };
  const generate = () => {
    const sizes = list(gen.sizes), colors = list(gen.colors), n = Math.max(0, Math.floor(Number(gen.stock)) || 0);
    const base = (f.slug || f.name).toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 8) || "SKU";
    const out: Var[] = [];
    for (const c of colors.length ? colors : [null]) for (const s of sizes.length ? sizes : [null]) out.push({ sku: `${base}-${(c ?? "X").slice(0, 3).toUpperCase()}${s ? `-${s}` : ""}`, size: s, color: c, stock: n });
    setVariants((o) => { const have = new Set(o.map((v) => v.sku)); return [...o, ...out.filter((v) => !have.has(v.sku))]; });
  };
  const updateStock = async (sku: string, stock: number) => {
    if (!initial) return;
    setErrors([]); setNotice(null);
    const r = await api<Product>("PUT", `/api/admin/products/${initial.id}/stock`, { sku, stock });
    if (r.ok) { setP(r.data); setVariants(r.data.variants); setNotice(`Stock for ${sku} set to ${stock}.`); router.refresh(); } else setErrors(r.errors);
  };
  const move = (i: number, d: number) => setImages((o) => { const a = [...o]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j]!, a[i]!]; return a; });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/products" className="text-xs uppercase tracking-[0.14em] underline">← All products</Link>
        {p && <><code className="rounded-sm bg-ink/6 px-2 py-1 text-xs">id {p.id}</code><Link href={`/product/${p.slug}`} className="text-xs uppercase tracking-[0.14em] underline">View in shop</Link><Link href={`/?p=${p.slug}`} className="text-xs uppercase tracking-[0.14em] underline">View in 3D mall</Link></>}
      </div>
      <Errors errors={errors} />{notice && <Notice>{notice}</Notice>}

      <Card title="Details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name"><Input value={f.name} onChange={(e) => set("name", e.target.value)} required /></Field>
          <Field label="Slug" hint={isNew ? "Leave blank to generate from the name." : "Changing the slug changes the product URL (the id never changes)."}><Input value={f.slug} onChange={(e) => set("slug", e.target.value)} /></Field>
          <Field label="Brand"><Select value={f.brand} onChange={(e) => set("brand", e.target.value)}>{brands.map((b) => <option key={b.slug} value={b.slug}>{b.name}{b.demo ? " (demo)" : ""}</option>)}</Select></Field>
          <Field label="Department (3D room)"><Select value={f.department} onChange={(e) => set("department", e.target.value as typeof f.department)}>{DEPARTMENTS.map((d) => <option key={d} value={d}>{departments.find((x) => x.slug === d)?.name ?? d}</option>)}</Select></Field>
          <Field label="Category"><Select value={f.category} onChange={(e) => set("category", e.target.value)}>{categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</Select></Field>
          <Field label="For"><Select value={f.audience} onChange={(e) => set("audience", e.target.value as typeof f.audience)}>{AUDIENCES.map((a) => <option key={a} value={a}>{a === "men" ? "Men" : a === "women" ? "Women" : "Unisex"}</option>)}</Select></Field>
          <Field label="Description" className="sm:col-span-2"><Textarea value={f.description} onChange={(e) => set("description", e.target.value)} /></Field>
          <Field label="Materials" hint="Comma separated, e.g. Cotton, Polyester"><Input value={f.materials} onChange={(e) => set("materials", e.target.value)} /></Field>
          <Field label="Tags" hint="Comma separated"><Input value={f.tags} onChange={(e) => set("tags", e.target.value)} /></Field>
          <fieldset className="sm:col-span-2"><legend className="mb-1 text-xs uppercase tracking-[0.14em] text-mute">Collections</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2">{collections.length === 0 && <span className="text-sm text-mute">No collections yet (create them under Taxonomy).</span>}{collections.map((c) => (
              <label key={c.slug} className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-ink" checked={f.collections.includes(c.slug)} onChange={(e) => set("collections", e.target.checked ? [...f.collections, c.slug] : f.collections.filter((x) => x !== c.slug))} />{c.name}</label>))}</div>
          </fieldset>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-ink" checked={f.featured} onChange={(e) => set("featured", e.target.checked)} />Featured product</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-ink" checked={f.showInMall} onChange={(e) => set("showInMall", e.target.checked)} />Show in the 3D mall</label>
        </div>
      </Card>

      <Card title="Price and discount">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Price"><Input inputMode="decimal" value={f.price} onChange={(e) => set("price", e.target.value)} placeholder="109.00" /></Field>
          <Field label="Sale price" hint="Blank = no discount. Must be lower than the price."><Input inputMode="decimal" value={f.sale} onChange={(e) => set("sale", e.target.value)} /></Field>
          <Field label="Currency (ISO)"><Input value={f.currency} maxLength={3} onChange={(e) => set("currency", e.target.value.toUpperCase())} /></Field>
        </div>
        {cents(f.price) && cents(f.sale) ? <p className="mt-3 text-sm text-mute">Discount: {Math.round((1 - cents(f.sale)! / cents(f.price)!) * 100)}% off</p> : null}
      </Card>

      <Card title="Source">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Where this record comes from"><Select value={f.sourceKind} onChange={(e) => set("sourceKind", e.target.value as typeof f.sourceKind)}><option value="demo">Demo data (test only)</option><option value="manual-verified">Manually verified</option><option value="official">Official brand page</option><option value="affiliate-feed">Authorised retailer / affiliate feed</option></Select></Field>
          {!demo && <><Field label="Retailer"><Input value={f.retailer} onChange={(e) => set("retailer", e.target.value)} /></Field><Field label="Product page URL (required)"><Input type="url" value={f.url} onChange={(e) => set("url", e.target.value)} /></Field><Field label="Checked on"><Input type="date" value={f.retrievedAt} onChange={(e) => set("retrievedAt", e.target.value)} /></Field></>}
        </div>
        <p className="mt-3 text-sm text-mute">{demo ? "Demo products are labelled everywhere and cannot be bought." : "Real products need a source URL, a price, at least one image and a licence for each image."}</p>
      </Card>

      <Card title="Images">
        <ul className="space-y-3">{images.map((im, i) => (
          <li key={im.url + i} className="grid gap-2 rounded-sm border border-line p-3 sm:grid-cols-[4rem_1fr_1fr_1fr_auto]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={im.url} alt="" className="size-16 rounded-sm bg-ink/6 object-cover" />
            <Input aria-label="Alt text" value={im.alt} placeholder="Alt text" onChange={(e) => setImages((o) => o.map((x, k) => (k === i ? { ...x, alt: e.target.value } : x)))} />
            <Input aria-label="Credit" value={im.credit ?? ""} placeholder="Credit" onChange={(e) => setImages((o) => o.map((x, k) => (k === i ? { ...x, credit: e.target.value || null } : x)))} />
            <Input aria-label="Licence" value={im.license ?? ""} placeholder="Licence / permission" onChange={(e) => setImages((o) => o.map((x, k) => (k === i ? { ...x, license: e.target.value || null } : x)))} />
            <span className="flex gap-1"><button type="button" className={smallBtn} onClick={() => move(i, -1)} aria-label="Move up">↑</button><button type="button" className={smallBtn} onClick={() => move(i, 1)} aria-label="Move down">↓</button><button type="button" className={dangerBtn} onClick={() => setImages((o) => o.filter((_, k) => k !== i))}>Remove</button></span>
          </li>))}</ul>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className={smallBtn}>Upload image<input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" className="sr-only" aria-label="Upload image" onChange={(e) => { void onImage(e.target.files?.[0]); e.target.value = ""; }} /></label>
          <span className="text-xs text-mute">PNG, JPEG, WebP, GIF or AVIF, up to 5 MB.</span>
        </div>
      </Card>

      <Card title="3D model">
        {model ? (
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Field label="Model URL"><Input value={model.url} onChange={(e) => setModel({ ...model, url: e.target.value })} /></Field>
            <Field label="Licence / permission"><Input value={model.license} onChange={(e) => setModel({ ...model, license: e.target.value })} /></Field>
            <button type="button" className={dangerBtn} onClick={() => setModel(null)}>Remove</button>
          </div>
        ) : <p className="text-sm text-mute">No model: the 3D mall draws a generic placeholder for this product&apos;s category.</p>}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className={smallBtn}>Upload GLB / GLTF<input type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" className="sr-only" aria-label="Upload 3D model" onChange={(e) => { void onModel(e.target.files?.[0]); e.target.value = ""; }} /></label>
          <span className="text-xs text-mute">GLB or self-contained glTF 2.0, up to 25 MB. Only upload a model that really is this product.</span>
        </div>
      </Card>

      <Card title="Sizes, colors and stock (variants)">
        <p className="mb-3 text-sm text-mute">Each row is one size/color with its own stock. Sizes, colors, total stock and availability are derived from these rows.{demo && " Demo stock is not live inventory."}</p>
        {variants.length > 0 && (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs uppercase tracking-[0.14em] text-mute"><th className="pb-2">SKU</th><th>Size</th><th>Color</th><th>Stock</th><th /></tr></thead>
            <tbody>{variants.map((v, i) => (
              <tr key={i}>
                <td className="pr-2 pb-2"><Input aria-label="SKU" value={v.sku} onChange={(e) => setVariants((o) => o.map((x, k) => (k === i ? { ...x, sku: e.target.value } : x)))} /></td>
                <td className="pr-2 pb-2"><Input aria-label="Size" value={v.size ?? ""} onChange={(e) => setVariants((o) => o.map((x, k) => (k === i ? { ...x, size: e.target.value || null } : x)))} /></td>
                <td className="pr-2 pb-2"><Input aria-label="Color" value={v.color ?? ""} onChange={(e) => setVariants((o) => o.map((x, k) => (k === i ? { ...x, color: e.target.value || null } : x)))} /></td>
                <td className="pr-2 pb-2"><Input aria-label="Stock" type="number" min={0} value={v.stock} onChange={(e) => setVariants((o) => o.map((x, k) => (k === i ? { ...x, stock: Math.max(0, Math.floor(Number(e.target.value)) || 0) } : x)))} /></td>
                <td className="pb-2 whitespace-nowrap">{!isNew && <button type="button" className={smallBtn} onClick={() => updateStock(v.sku, v.stock)} title="Saves only this variant's stock">Update stock</button>} <button type="button" className={dangerBtn} onClick={() => setVariants((o) => o.filter((_, k) => k !== i))}>×</button></td>
              </tr>))}</tbody></table></div>
        )}
        {colorNames.length > 0 && <div className="mt-3 flex flex-wrap gap-3">{colorNames.map((n) => <label key={n} className="flex items-center gap-2 text-xs">{n}<input aria-label={`${n} hex`} className="h-8 w-24 rounded-sm border border-line px-2" value={hex[n] ?? ""} placeholder="#1c1c1e" onChange={(e) => setHex((o) => ({ ...o, [n]: e.target.value }))} /></label>)}</div>}
        <div className="mt-4 grid gap-3 rounded-sm border border-dashed border-line p-3 sm:grid-cols-[1fr_1fr_6rem_auto]">
          <Input aria-label="Sizes to add" placeholder="Sizes, e.g. S, M, L" value={gen.sizes} onChange={(e) => setGen({ ...gen, sizes: e.target.value })} />
          <Input aria-label="Colors to add" placeholder="Colors, e.g. Black, Navy" value={gen.colors} onChange={(e) => setGen({ ...gen, colors: e.target.value })} />
          <Input aria-label="Initial stock" type="number" min={0} value={gen.stock} onChange={(e) => setGen({ ...gen, stock: e.target.value })} />
          <button type="button" className={smallBtn} onClick={generate}>Add variants</button>
        </div>
        {variants.length === 0 && <div className="mt-4 max-w-xs"><Field label="Availability (no variants)"><Select value={f.availability} onChange={(e) => set("availability", e.target.value as typeof f.availability)}><option value="in_stock">In stock</option><option value="out_of_stock">Out of stock</option><option value="unknown">Unknown</option></Select></Field></div>}
        {p && p.variants.length > 0 && <p className="mt-3 text-sm">Total stock: <strong>{p.variants.reduce((n, v) => n + v.stock, 0)}</strong> · Availability: <strong>{p.availability.replace("_", " ")}</strong></p>}
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={busy || !f.name.trim()}>{busy ? "Saving…" : isNew ? "Create product" : "Save changes"}</Button>
        {!isNew && role === "admin" && <button type="button" className={dangerBtn} onClick={remove}>Delete product</button>}
        {!isNew && role !== "admin" && <span className="text-xs text-mute">Editors cannot delete products.</span>}
      </div>
    </div>
  );
}
