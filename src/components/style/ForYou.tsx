"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { call } from "@/components/tryon/tryon-client";
import { useMe } from "@/components/commerce/auth-client";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";
import { useMounted } from "@/lib/use-mounted";
import { DEFAULT_AVATAR, SLOT_LABEL, encodeShare, type Picks, type Slot } from "@/modules/outfit/core";
import { useFavorites } from "@/stores/favorites-store";
import { useOutfits } from "@/stores/outfit-store";
import { useStyle } from "@/stores/style-store";
import { useToasts } from "@/stores/toast-store";
import type { LiteDiscovery } from "@/server/style/lite";
import { RecCard } from "./RecCard";

type Resp = LiteDiscovery & { profileTags: string[] };
const SIGNAL_INFO = [
  { key: "favorites", label: "My favorite products", note: "Products you saved with the heart." },
  { key: "outfits", label: "My saved outfits", note: "Items in outfits you saved in Outfit Studio." },
  { key: "views", label: "Products I look at", note: "Counted on this device only while this is on." },
  { key: "purchases", label: "My previous purchases", note: "Read from your account. Bought items are not recommended again." },
] as const;

export function ForYou() {
  const mounted = useMounted(), me = useMe(), push = useToasts((s) => s.push);
  const { answers, consent, views, setConsent, clearViews, reset } = useStyle();
  const favs = useFavorites((s) => s.ids), saved = useOutfits((s) => s.saved);
  const [data, setData] = useState<Resp | null>(null), [err, setErr] = useState<string | null>(null), [busy, setBusy] = useState(true);
  const seq = useRef(0);

  const signals = useMemo(() => ({
    favorites: consent.favorites ? favs : [], outfits: consent.outfits ? saved.flatMap((o) => Object.values(o.picks).map((p) => p.productId)) : [],
    views: consent.views ? views : {}, purchases: [], consent,
  }), [consent, favs, saved, views]);
  const key = JSON.stringify([answers, signals]);

  useEffect(() => {
    if (!mounted) return;
    const n = ++seq.current; setBusy(true);
    const t = setTimeout(async () => {
      const r = await call<Resp>("POST", "/api/style/recommend", { profile: answers ? { answers } : undefined, signals, limit: 12 });
      if (n !== seq.current) return;
      setBusy(false); if (r.ok) { setData(r.data); setErr(null); } else setErr(r.error);
    }, 250);
    return () => clearTimeout(t);
    // key captures the inputs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, key]);

  if (!mounted) return <div className="min-h-[30rem]" aria-busy="true" />;
  const d = data;
  return (
    <div className="space-y-12">
      <section aria-label="Your profile" className="rounded-lg border border-line bg-surface p-5">
        {answers ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><p className="text-xs uppercase tracking-wider text-mute">Your style</p>
              <ul className="mt-2 flex flex-wrap gap-2" data-testid="profile-tags">{(d?.profileTags ?? []).map((t) => <li key={t} className="rounded-full border border-line px-3 py-1 text-sm">{t}</li>)}</ul></div>
            <Link href="/style-quiz" className="inline-flex min-h-11 items-center rounded-sm border border-ink px-5 text-sm font-medium uppercase tracking-[0.12em] hover:bg-ink hover:text-paper">Edit my answers</Link>
          </div>
        ) : (
          <div className="max-w-xl"><p className="font-medium">These are general picks.</p><p className="mt-1 text-sm text-mute">Take the short style quiz and every list on this page will be matched to your taste.</p>
            <Link href="/style-quiz" className="mt-3 inline-flex min-h-11 items-center rounded-sm bg-ink px-6 text-sm font-medium uppercase tracking-[0.12em] text-paper">Take the style quiz</Link></div>
        )}
      </section>

      {err && <p className="rounded-md border border-danger/40 bg-surface p-4 text-sm" role="alert">{err} <button className="underline" onClick={() => location.reload()}>Reload</button></p>}
      {busy && !d && <p className="text-sm text-mute" role="status">Finding your picks…</p>}
      {d && (
        <div className={cn("space-y-12 transition-opacity", busy && "opacity-60")} data-testid="discovery" aria-busy={busy}>
          {d.top.length === 0 ? <p className="rounded-md border border-dashed border-line p-6 text-center text-sm text-mute" data-testid="no-results">Nothing in stock matches all of your filters. Try widening your budget, removing avoided colors or choosing more departments, in <Link href="/style-quiz" className="underline">your answers</Link>.</p> : (
            <>
              <Section title={d.personalized ? "Picks for you" : "Featured picks"} sub={d.personalized ? `${d.meta.candidates} of ${d.meta.total} products match your filters` : "Chosen by the shop. Take the quiz to personalize."}>
                <Grid>{d.top.map((i) => <RecCard key={i.id} item={i} showMatch={d.personalized} />)}</Grid></Section>
              {d.departments.length > 0 && <Section title="Departments to explore" sub="Where most of your matches are">
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="departments">{d.departments.map((x) => <li key={x.slug}><Link href={`/shop?department=${x.slug}`} className="block rounded-md border border-line bg-surface p-4 hover:border-ink"><span className="block font-medium">{x.name}</span><span className="block text-sm text-mute">{x.why}</span></Link></li>)}</ul></Section>}
              {d.collections.map((c) => <Section key={c.id} title={c.title} sub={c.subtitle} id={c.id}><Grid>{c.items.map((i) => <RecCard key={i.id} item={i} showMatch={d.personalized} />)}</Grid></Section>)}
              {d.outfits.length > 0 && <Section title="Outfits for you" sub="Complete looks from available pieces">
                <ul className="grid gap-4 lg:grid-cols-3" data-testid="outfits">{d.outfits.map((o) => <Outfit key={o.id} o={o} />)}</ul></Section>}
              {d.accessories.length > 0 && <Section title="Accessories to add" sub="Bags, watches and eyewear that fit your profile"><Grid>{d.accessories.map((i) => <RecCard key={i.id} item={i} showMatch={d.personalized} />)}</Grid></Section>}
              {d.newArrivals.length > 0 && <Section title="New arrivals you may like" sub="From our New arrivals department, filtered to your taste"><Grid>{d.newArrivals.map((i) => <RecCard key={i.id} item={i} showMatch={d.personalized} />)}</Grid></Section>}
            </>
          )}
        </div>
      )}

      <section aria-label="Personalization" className="rounded-lg border border-line bg-surface p-5" data-testid="personalization">
        <h2 className="text-lg font-medium">You control personalization</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-mute">Picks come from your quiz answers and ordinary rules over our catalog, with no AI service. You can also let us learn from your activity. Every option below is <strong className="font-medium text-ink">off until you turn it on</strong>, and affects only which products and colors are ranked higher. We never guess who you are, your body, age, gender or income.</p>
        <ul className="mt-4 space-y-3">{SIGNAL_INFO.map((s) => { const disabled = s.key === "purchases" && !me; return (
          <li key={s.key}><label className={cn("flex items-start gap-3 text-sm", disabled && "opacity-60")}><input type="checkbox" className="mt-0.5 size-5" checked={consent[s.key] && !disabled} disabled={disabled} onChange={(e) => setConsent({ [s.key]: e.target.checked })} data-testid={`consent-${s.key}`} />
            <span><span className="block font-medium">{s.label}</span><span className="block text-mute">{s.note}{disabled ? " Sign in to use this." : ""}</span></span></label></li>); })}</ul>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <button className="min-h-10 rounded-sm border border-line px-3 hover:border-ink" onClick={() => { clearViews(); push("Cleared the products you viewed", "info"); }}>Clear what I viewed</button>
          {answers && <button className="min-h-10 rounded-sm border border-line px-3 text-danger hover:border-danger" onClick={() => { reset(); push("Style profile deleted", "info"); }} data-testid="delete-profile">Delete my style profile</button>}
        </div>
        {d && d.meta.signalsUsed.length > 0 && <p className="mt-3 text-xs text-mute">Currently using: {d.meta.signalsUsed.join(", ")}.</p>}
      </section>
    </div>
  );
}

function Section({ title, sub, id, children }: { title: string; sub: string; id?: string; children: React.ReactNode }) {
  return <section aria-label={title} data-collection={id}><div className="mb-4"><h2 className="font-display text-2xl">{title}</h2><p className="text-sm text-mute">{sub}</p></div>{children}</section>;
}
const Grid = ({ children }: { children: React.ReactNode }) => <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">{children}</div>;

function Outfit({ o }: { o: Resp["outfits"][number] }) {
  const total = new Map<string, number>(); o.items.forEach((i) => i.price && total.set(i.price.currency, (total.get(i.price.currency) ?? 0) + i.price.amount));
  return (
    <li className="rounded-md border border-line bg-surface p-4" data-testid="outfit">
      <p className="font-medium leading-snug">{o.name}</p><p className="mt-1 text-xs text-mute">Compatibility {o.match}% · {[...total].map(([currency, amount]) => formatMoney({ amount, currency })).join(" + ")}</p>
      <ul className="my-3 space-y-2">{o.items.map((i) => (
        <li key={i.id} className="flex items-center gap-3">{/* eslint-disable-next-line @next/next/no-img-element */}{i.image ? <img src={i.image} alt="" loading="lazy" className="size-12 shrink-0 rounded-sm bg-paper object-cover" /> : <span className="size-12 shrink-0 rounded-sm bg-paper" />}
          <span className="min-w-0 flex-1"><Link href={`/product/${i.slug}`} className="line-clamp-1 text-sm hover:underline">{i.name}</Link><span className="block text-xs text-mute">{SLOT_LABEL[i.slot as Slot]}{i.color ? ` · ${i.color}` : ""}</span></span></li>))}</ul>
      <p className="text-xs leading-relaxed text-mute">{o.why}</p>
      <Link href={`/style-creator?o=${encodeShare(DEFAULT_AVATAR, o.picks as Picks, o.name.slice(0, 60))}`} className="mt-3 inline-flex min-h-10 items-center rounded-sm border border-ink px-4 text-sm hover:bg-ink hover:text-paper">Open in Outfit Studio</Link>
    </li>
  );
}
