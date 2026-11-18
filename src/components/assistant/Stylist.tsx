"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { call } from "@/components/tryon/tryon-client";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import { useMounted } from "@/lib/use-mounted";
import { SUGGESTED, type AItem, type Chip, type OutfitCard } from "@/modules/assistant/core";
import { useCart } from "@/stores/cart-store";
import { useOutfits } from "@/stores/outfit-store";
import { useAssistant, type Msg, type ReplyData } from "@/stores/assistant-store";
import { useStyle } from "@/stores/style-store";
import { DeptCardView, type DeptData } from "./DeptCardView";
import { OutfitCardView } from "./OutfitCardView";

type Config = { mode: "rules" | "provider"; provider: { id: string; label: string; test: boolean; privacyNote: string } | null; message: string | null };
export type PageContext = { productId: string | null; department: string | null };
const TEST_MODES = [["ok", "Works"], ["hallucinate", "Invents products"], ["badprice", "Invents a price"], ["overbudget", "Over budget"], ["garbage", "Bad reply"], ["down", "Unavailable"], ["timeout", "Times out"]] as const;

/** The conversation. Same component on /assistant and in the floating drawer; history and settings are shared through one store. */
export function Stylist({ variant, page }: { variant: "page" | "drawer"; page: PageContext }) {
  const mounted = useMounted();
  const { messages, state, allowed, add, setState, setAllowed, clear, removeFailed, draft, setDraft } = useAssistant();
  const profileAnswers = useStyle((s) => s.answers), cartLines = useCart((s) => s.lines), saved = useOutfits((s) => s.saved);
  const [loading, setLoading] = useState(false), [config, setConfig] = useState<Config | null>(null), [testMode, setTestMode] = useState("ok"), [settings, setSettings] = useState(false);
  const endRef = useRef<HTMLDivElement>(null), input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { void call<Config>("GET", "/api/assistant/config").then((r) => r.ok && setConfig(r.data)); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [messages.length, loading]);

  const context = useMemo(() => ({
    authorized: allowed, profileAnswers: allowed.profile ? profileAnswers ?? undefined : undefined,
    cartProductIds: allowed.cart ? [...new Set(cartLines.map((l) => l.productId))] : undefined,
    savedOutfitProductIds: allowed.outfits ? saved.flatMap((o) => Object.values(o.picks).map((p) => p.productId)).slice(0, 100) : undefined,
    currentProductId: allowed.page ? page.productId : null, currentDepartment: allowed.page ? page.department : null,
  }), [allowed, profileAnswers, cartLines, saved, page]);

  const send = useCallback(async (text: string, retryOf?: string) => {
    const t = text.trim(); if (!t || loading) return;
    if (retryOf) removeFailed(retryOf); else add({ role: "user", text: t });
    setDraft(""); setLoading(true);
    const st = useAssistant.getState();
    const history = st.messages.filter((m) => !m.failed).slice(-7, -1).map((m) => ({ role: m.role, text: m.text.slice(0, 500) }));
    const res = await call<ReplyData>("POST", "/api/assistant/chat", { message: t, state: st.state, context, history, testMode: config?.provider?.test ? testMode : undefined });
    setLoading(false);
    if (!res.ok) { add({ role: "assistant", text: res.status === 0 ? "I couldn’t reach the stylist. Your conversation is saved. Check your connection and try again." : res.error, failed: { text: t } }); return; }
    setState(res.data.answer.state); add({ role: "assistant", text: res.data.answer.message, data: res.data });
    if (variant === "page") input.current?.focus();
  }, [loading, add, removeFailed, setDraft, setState, context, config, testMode, variant]);

  // other parts of the site can queue a question ("Ask the stylist about this product")
  useEffect(() => { const h = (e: Event) => { const t = (e as CustomEvent<string>).detail; if (t) void send(t); }; window.addEventListener("vestora-stylist-ask", h); return () => window.removeEventListener("vestora-stylist-ask", h); }, [send]);

  if (!mounted) return <div className="min-h-[24rem]" aria-busy="true" />;
  const pageChips: Chip[] = allowed.page ? [...(page.productId ? [{ label: "Find shoes matching this", text: "Find shoes matching this jacket" }, { label: "Build an outfit with this", text: "Build an outfit around this piece" }] : []), ...(page.department ? [{ label: "Where is this department?", text: "Where is this department?" }] : [])] : [];
  const engine = !config ? "Checking…" : config.mode === "rules" ? "Rule-based stylist · no AI model connected" : config.provider!.test ? `${config.provider!.label}` : `AI model: ${config.provider!.label}`;
  return (
    <section aria-label="Stylist chat" className={cn("flex flex-col", variant === "page" ? "min-h-[32rem]" : "h-full")} data-testid="stylist">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div className="min-w-0"><p className="text-xs uppercase tracking-[0.18em] text-accent-ink">Stylist</p><p className="truncate text-xs text-mute" data-testid="engine-label">{engine}</p></div>
        <div className="flex gap-2">
          <button className="min-h-9 rounded-sm border border-line px-3 text-sm hover:border-ink" aria-expanded={settings} onClick={() => setSettings((s) => !s)} data-testid="settings-toggle">What I can use</button>
          <button className="min-h-9 rounded-sm border border-line px-3 text-sm hover:border-ink disabled:opacity-40" onClick={() => { clear(); }} disabled={messages.length === 0} data-testid="clear">Clear conversation</button>
        </div>
      </header>
      {settings && (
        <div className="mt-3 space-y-2 rounded-md border border-line bg-surface p-3 text-sm" data-testid="settings">
          <p className="text-xs text-mute">The stylist uses only what you allow. Nothing you type is stored on our servers; the conversation stays on this device until you clear it.{config?.mode === "provider" && !config.provider!.test ? ` ${config.provider!.privacyNote}` : config?.provider?.test ? " " + config.provider.privacyNote : " Your messages are answered by our own rules and are not sent to any AI service."}</p>
          {([["page", "The page I’m on", "The product or department you opened the stylist from."], ["profile", "My style quiz profile", profileAnswers ? "Your saved preferences shape suggestions." : "Take the style quiz first to use this."], ["cart", "My cart", "Lets me build outfits around what you’re buying."], ["outfits", "My saved outfits", "Learn the colors and pieces you like."]] as const).map(([k, l, d]) => (
            <label key={k} className="flex items-start gap-3"><input type="checkbox" className="mt-0.5 size-5" checked={allowed[k]} disabled={k === "profile" && !profileAnswers} onChange={(e) => setAllowed({ [k]: e.target.checked })} data-testid={`allow-${k}`} /><span><span className="block font-medium">{l}</span><span className="block text-mute">{d}</span></span></label>))}
          {config?.provider?.test && <label className="flex items-center gap-2 text-xs text-mute">Scripted model behavior (testing)<select className="min-h-9 rounded-sm border border-line bg-paper px-2 text-ink" value={testMode} onChange={(e) => setTestMode(e.target.value)} data-testid="test-mode">{TEST_MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>}
        </div>
      )}
      <div className="mt-4 flex-1 space-y-5 overflow-y-auto pr-1" role="log" aria-live="polite" aria-label="Conversation" data-testid="log">
        {messages.length === 0 && (
          <div className="space-y-3" data-testid="welcome"><p className="text-sm leading-relaxed text-mute">Ask for an outfit for an occasion, a season or a style, find pieces that match something you chose, search by budget, or ask where a department is in the mall. Every product I show is in stock and comes from the catalog.</p>
            <Chips chips={SUGGESTED} onPick={(c) => void send(c.text)} disabled={loading} label="Suggested questions" /></div>
        )}
        {messages.map((m, i) => <Message key={m.id} m={m} last={i === messages.length - 1} onChip={(c) => void send(c.text)} onRetry={(id, text) => void send(text, id)} disabled={loading} />)}
        {loading && <div className="flex items-center gap-2 text-sm text-mute" role="status" data-testid="loading"><span className="inline-flex gap-1" aria-hidden="true">{[0, 1, 2].map((d) => <span key={d} className="size-2 animate-pulse rounded-full bg-mute" style={{ animationDelay: `${d * 150}ms` }} />)}</span>Looking through the catalog…</div>}
        <div ref={endRef} />
      </div>
      {pageChips.length > 0 && <div className="mt-3"><Chips chips={pageChips} onPick={(c) => void send(c.text)} disabled={loading} label="About this page" /></div>}
      <form className="mt-3 flex items-end gap-2 border-t border-line pt-3" onSubmit={(e) => { e.preventDefault(); void send(draft); }}>
        <label htmlFor={`stylist-input-${variant}`} className="sr-only">Message the stylist</label>
        <textarea id={`stylist-input-${variant}`} ref={input} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(draft); } }} rows={1} maxLength={500} placeholder="Ask for an outfit, a match, or a department…" className="max-h-32 min-h-11 flex-1 resize-none rounded-sm border border-line bg-surface px-3 py-2.5 text-sm" data-testid="input" />
        <button className="min-h-11 rounded-sm bg-ink px-5 text-sm font-medium uppercase tracking-[0.12em] text-paper disabled:opacity-40" disabled={loading || !draft.trim()} data-testid="send">Send</button>
      </form>
    </section>
  );
}

function Chips({ chips, onPick, disabled, label }: { chips: Chip[]; onPick: (c: Chip) => void; disabled?: boolean; label: string }) {
  return <ul className="flex flex-wrap gap-2" aria-label={label} data-testid="chips">{chips.map((c) => <li key={c.label}><button className="min-h-10 rounded-full border border-line bg-surface px-4 text-sm hover:border-ink disabled:opacity-40" disabled={disabled} onClick={() => onPick(c)}>{c.label}</button></li>)}</ul>;
}

function Message({ m, last, onChip, onRetry, disabled }: { m: Msg; last: boolean; onChip: (c: Chip) => void; onRetry: (id: string, text: string) => void; disabled: boolean }) {
  if (m.role === "user") return <div className="flex justify-end"><p className="max-w-[85%] rounded-2xl rounded-br-sm bg-ink px-4 py-2.5 text-sm text-paper" data-testid="user-msg">{m.text}</p></div>;
  const d = m.data, a = d?.answer;
  return (
    <div className="space-y-3" data-testid="assistant-msg">
      {m.failed ? (
        <div className="rounded-md border border-danger/50 bg-surface p-3 text-sm" role="alert" data-testid="chat-error"><p>{m.text}</p>
          <div className="mt-2 flex flex-wrap gap-2"><button className="min-h-10 rounded-sm bg-ink px-4 text-paper" onClick={() => onRetry(m.id, m.failed!.text)} disabled={disabled}>Try again</button><Link className="inline-flex min-h-10 items-center rounded-sm border border-line px-4" href="/shop?available=1">Browse in-stock products</Link><Link className="inline-flex min-h-10 items-center rounded-sm border border-line px-4" href="/style-quiz">Take the style quiz</Link></div></div>
      ) : <p className="max-w-[90%] rounded-2xl rounded-bl-sm bg-surface px-4 py-3 text-sm leading-relaxed ring-1 ring-line" data-testid="assistant-text">{m.text}</p>}
      {d?.error && <div className="rounded-md border border-warn/50 bg-surface p-3 text-sm" role="alert" data-testid="provider-error"><p className="font-medium">{d.error.message}</p><p className="mt-1 text-mute">The rule-based suggestions below are from the stylist’s built-in rules, not from the AI model. You can also <Link href="/shop?available=1" className="underline">browse the shop with filters</Link>.</p></div>}
      {d?.notice && !d.error && d.provider && <p className="rounded-md bg-paper px-3 py-2 text-xs text-mute" data-testid="notice">{d.notice}</p>}
      {d && <p className="text-[11px] uppercase tracking-wider text-mute" data-testid="source">{d.source === "rules" ? "Rule-based suggestions" : d.provider?.test ? "Scripted test model · not AI" : `AI model: ${d.provider?.label}`}{Object.entries(d.used).filter(([, v]) => v).length ? ` · used: ${Object.entries(d.used).filter(([, v]) => v).map(([k]) => (k === "page" ? "current page" : k === "profile" ? "style profile" : k === "cart" ? "cart" : "saved outfits")).join(", ")}` : ""}</p>}
      {a && a.understood.length > 0 && <p className="text-xs text-mute" data-testid="understood">I understood: {a.understood.join(" · ")}</p>}
      {a?.outfits.map((o) => <OutfitCardView key={o.id} o={o as OutfitCard} state={a.state} allowed={useAssistant.getState().allowed} profileAnswers={useStyle.getState().answers} shownIds={a.state.shown} />)}
      {a && a.products.length > 0 && <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" data-testid="products">{(a.products as AItem[]).map((p) => (
        <li key={p.id} className="overflow-hidden rounded-md border border-line bg-surface"><Link href={`/product/${p.slug}`} className="block">{/* eslint-disable-next-line @next/next/no-img-element */}{p.image && <img src={p.image} alt="" loading="lazy" className="aspect-[4/5] w-full bg-paper object-cover" />}</Link>
          <div className="space-y-0.5 p-2.5"><Link href={`/product/${p.slug}`} className="line-clamp-2 text-sm font-medium hover:underline">{p.name}</Link><p className="text-xs text-mute">{p.brandName} · {p.price ? formatMoney(p.price) : "Price not listed"} · <span className="text-ok">In stock</span></p>{p.why && <p className="text-xs text-mute">{p.why}</p>}
            <button className="mt-1 min-h-9 text-xs underline underline-offset-4" onClick={() => onChip({ label: "match", text: `Find shoes matching the ${p.name}` })} disabled={disabled}>{a.ask?.slot === "anchor" ? "Match this one" : "Find matches"}</button></div></li>))}</ul>}
      {a && a.departments.length > 0 && <div className="space-y-3">{(a.departments as DeptData[]).map((x) => <DeptCardView key={x.slug} d={x} />)}</div>}
      {last && a && a.chips.length > 0 && <Chips chips={a.chips} onPick={onChip} disabled={disabled} label="Quick actions" />}
    </div>
  );
}
