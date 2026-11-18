"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import { useMounted } from "@/lib/use-mounted";
import { COMBOS, COMBO_INFO, KIND_LABEL, QUESTIONS, SEASONS, STYLES, STYLE_INFO, answered, missingRequired, type Answers, type Facts, type QuestionId } from "@/modules/style/core";
import { OCCASIONS, OCCASION_LABEL } from "@/modules/outfit/core";
import { useStyle } from "@/stores/style-store";
import { useToasts } from "@/stores/toast-store";
import { ProfileSummary } from "./ProfileSummary";

const chip = (on: boolean) => cn("min-h-11 rounded-full border px-4 text-sm", on ? "border-ink bg-ink text-paper" : "border-line bg-surface hover:border-ink");
const card = (on: boolean) => cn("min-h-16 rounded-md border bg-surface p-3 text-left", on ? "border-ink ring-2 ring-ink" : "border-line hover:border-ink");
const toggle = <T,>(xs: T[], x: T, max?: number) => (xs.includes(x) ? xs.filter((y) => y !== x) : max && xs.length >= max ? [...xs.slice(1), x] : [...xs, x]);
const FORMAL = ["Always casual", "Mostly casual", "A mix of both", "Mostly formal", "Always formal"];
const BUDGET_STEPS = [0, 5000, 10000, 20000, 40000, 80000];

export function StyleQuiz({ facts }: { facts: Facts }) {
  const mounted = useMounted(), router = useRouter(), push = useToasts((s) => s.push);
  const { answers, draft, setDraft, skip, finish, startEdit, startNew, reset } = useStyle();
  const [mode, setMode] = useState<"home" | "quiz" | "review">("home");
  const [step, setStep] = useState(0);
  const q = QUESTIONS[step]!;
  const missing = missingRequired(draft), isLast = step === QUESTIONS.length - 1;

  if (!mounted) return <div className="min-h-[24rem]" aria-busy="true" />;

  if (mode === "home") return (
    <div className="space-y-6">
      {answers ? (
        <>
          <p className="text-sm text-mute">Your style profile is saved{" "}on this device{" "}(and on your account when you are signed in).</p>
          <ProfileSummary answers={answers} facts={facts} onEdit={(id) => { startEdit(); setStep(QUESTIONS.findIndex((x) => x.id === id)); setMode("quiz"); }} />
          <div className="flex flex-wrap gap-3">
            <Link href="/for-you" className="inline-flex min-h-12 items-center rounded-sm bg-ink px-6 text-sm font-medium uppercase tracking-[0.12em] text-paper">See my recommendations</Link>
            <button className="min-h-12 rounded-sm border border-ink px-6 text-sm font-medium uppercase tracking-[0.12em]" onClick={() => { startEdit(); setStep(0); setMode("quiz"); }}>Edit my answers</button>
            <button className="min-h-12 rounded-sm border border-line px-6 text-sm" onClick={() => { startNew(); setStep(0); setMode("quiz"); }}>Start over</button>
            <button className="min-h-12 rounded-sm border border-line px-6 text-sm text-danger" onClick={() => { reset(); push("Style profile deleted", "info"); }}>Delete my profile</button>
          </div>
        </>
      ) : (
        <div className="max-w-xl space-y-4">
          <p className="leading-relaxed text-mute">Eleven short questions about the styles, colors and budget you like. You can skip anything optional. Your picks are matched against our real catalog with ordinary rules: no AI service is involved and nothing sensitive is guessed.</p>
          <button className="min-h-14 rounded-sm bg-ink px-8 text-sm font-medium uppercase tracking-[0.12em] text-paper" onClick={() => { startNew(); setStep(0); setMode("quiz"); }} data-testid="start-quiz">Start the quiz</button>
        </div>
      )}
    </div>
  );

  if (mode === "review") return (
    <div className="space-y-6" data-testid="quiz-review">
      <h2 className="text-lg font-medium">Your style profile</h2>
      <ProfileSummary answers={{ ...draft, skipped: QUESTIONS.filter((x) => !answered(draft, x.id)).map((x) => x.id) }} facts={facts} onEdit={(id) => { setStep(QUESTIONS.findIndex((x) => x.id === id)); setMode("quiz"); }} />
      <div className="flex flex-wrap gap-3">
        <button className="min-h-12 rounded-sm bg-ink px-6 text-sm font-medium uppercase tracking-[0.12em] text-paper" data-testid="save-profile" onClick={() => { if (finish()) { push("Style profile saved", "success"); router.push("/for-you"); } }}>Save and see my picks</button>
        <button className="min-h-12 rounded-sm border border-line px-6 text-sm" onClick={() => setMode("quiz")}>Back to the questions</button>
      </div>
    </div>
  );

  const go = (n: number) => setStep(Math.max(0, Math.min(QUESTIONS.length - 1, n)));
  const next = () => { if (isLast) setMode("review"); else go(step + 1); };
  const ok = !q.required || answered(draft, q.id);
  return (
    <div className="space-y-6" data-testid="quiz">
      <div>
        <div className="flex items-center justify-between text-xs uppercase tracking-wider text-mute"><span>Question {step + 1} of {QUESTIONS.length}</span><span>{q.required ? "Required" : "Optional"}</span></div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={1} aria-valuemax={QUESTIONS.length} aria-valuenow={step + 1} aria-label="Quiz progress"><div className="h-full bg-ink transition-[width]" style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }} /></div>
        <ol className="mt-3 flex flex-wrap gap-1.5" aria-label="Jump to a question">{QUESTIONS.map((x, i) => <li key={x.id}><button className={cn("size-9 rounded-full border text-xs", i === step ? "border-ink bg-ink text-paper" : answered(draft, x.id) ? "border-ink/40 bg-surface" : "border-line text-mute", )} onClick={() => go(i)} aria-label={`Question ${i + 1}: ${x.title}${answered(draft, x.id) ? ", answered" : draft.skipped.includes(x.id) ? ", skipped" : ""}`} aria-current={i === step ? "step" : undefined}>{i + 1}</button></li>)}</ol>
      </div>
      <fieldset>
        <legend className="font-display text-2xl leading-tight">{q.title}</legend>
        <p className="mt-1 text-sm text-mute">{q.hint}</p>
        <div className="mt-4"><Step id={q.id} facts={facts} a={draft} set={setDraft} /></div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <button className="min-h-12 rounded-sm border border-line px-5 text-sm disabled:opacity-40" onClick={() => go(step - 1)} disabled={step === 0}>Back</button>
        <button className="min-h-12 rounded-sm bg-ink px-8 text-sm font-medium uppercase tracking-[0.12em] text-paper disabled:opacity-40" onClick={next} disabled={!ok} data-testid="next">{isLast ? "Review my profile" : "Next"}</button>
        {!q.required && <button className="min-h-12 px-3 text-sm underline underline-offset-4" onClick={() => { skip(q.id); setDraft(clearFor(q.id)); next(); }} data-testid="skip">Skip this question</button>}
        {!ok && <span className="text-xs text-warn" role="status">Choose at least one to continue.</span>}
      </div>
      {missing.length === 0 && step < QUESTIONS.length - 1 && <button className="min-h-10 text-sm underline underline-offset-4" onClick={() => setMode("review")} data-testid="finish-early">I’m done: review my profile</button>}
    </div>
  );
}

/** Skipping a question clears its answer. */
function clearFor(id: QuestionId): Partial<Answers> {
  switch (id) {
    case "kinds": return { kinds: [] }; case "combos": return { combos: [] }; case "formality": return { formality: null }; case "occasions": return { occasions: [] };
    case "colors": return { colors: [], avoidColors: [] }; case "seasons": return { seasons: [] }; case "budget": return { budget: null }; case "brands": return { brands: [] }; case "audience": return { audience: "all" };
    default: return {};
  }
}

type Setter = (p: Partial<Answers> | ((cur: Answers) => Partial<Answers>)) => void;
function Step({ id, facts, a, set }: { id: QuestionId; facts: Facts; a: Answers; set: Setter }) {
  const money = (n: number) => formatMoney({ amount: n, currency: facts.currency });
  switch (id) {
    case "departments": return <div className="flex flex-wrap gap-2">{facts.departments.map((d) => <button key={d.slug} aria-pressed={a.departments.includes(d.slug)} className={chip(a.departments.includes(d.slug))} onClick={() => set((cur) => ({ departments: toggle(cur.departments, d.slug) }))}>{d.name}</button>)}</div>;
    case "kinds": return <div className="flex flex-wrap gap-2">{facts.kinds.map((k) => <button key={k} aria-pressed={a.kinds.includes(k)} className={chip(a.kinds.includes(k))} onClick={() => set((cur) => ({ kinds: toggle(cur.kinds, k) }))}>{KIND_LABEL[k] ?? k}</button>)}</div>;
    case "styles": return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{STYLES.map((s) => { const on = a.styles.includes(s); return <button key={s} aria-pressed={on} className={card(on)} onClick={() => set((cur) => ({ styles: toggle(cur.styles, s, 3) }))}><span className="block font-medium">{STYLE_INFO[s].label}</span><span className="block text-sm text-mute">{STYLE_INFO[s].blurb}</span></button>; })}</div>;
    case "combos": return <div className="grid gap-3 sm:grid-cols-2">{COMBOS.map((c) => { const on = a.combos.includes(c); return <button key={c} aria-pressed={on} className={card(on)} onClick={() => set((cur) => ({ combos: toggle(cur.combos, c) }))}><span className="block text-sm">{COMBO_INFO[c].label}</span></button>; })}</div>;
    case "formality": return (
      <div className="max-w-md"><label htmlFor="q-form" className="sr-only">Casual to formal</label>
        <input id="q-form" type="range" min={1} max={5} step={1} value={a.formality ?? 3} onChange={(e) => set({ formality: Number(e.target.value) })} onPointerDown={() => a.formality === null && set({ formality: 3 })} className="w-full" aria-valuetext={FORMAL[(a.formality ?? 3) - 1]} data-testid="formality" />
        <div className="mt-1 flex justify-between text-xs text-mute"><span>Casual</span><span>Formal</span></div>
        <p className="mt-2 text-sm font-medium" aria-live="polite">{a.formality === null ? "Not set yet (move the slider)" : FORMAL[a.formality - 1]}</p></div>);
    case "occasions": return <div className="flex flex-wrap gap-2">{OCCASIONS.map((o) => <button key={o} aria-pressed={a.occasions.includes(o)} className={chip(a.occasions.includes(o))} onClick={() => set((cur) => ({ occasions: toggle(cur.occasions, o) }))}>{OCCASION_LABEL[o]}</button>)}</div>;
    case "colors": return (
      <div className="space-y-5">
        <div><p className="mb-2 text-sm font-medium">Colors I like</p><div className="flex flex-wrap gap-2">{facts.colors.map((c) => { const on = a.colors.includes(c.name); return <button key={c.name} aria-pressed={on} onClick={() => set((cur) => ({ colors: toggle(cur.colors, c.name), avoidColors: cur.avoidColors.filter((x) => x !== c.name) }))} className={cn(chip(on), "flex items-center gap-2")}><span className="size-4 rounded-full ring-1 ring-line" style={{ background: c.hex }} />{c.name}</button>; })}</div></div>
        <div><p className="mb-2 text-sm font-medium">Colors to avoid <span className="font-normal text-mute">(optional)</span></p><div className="flex flex-wrap gap-2">{facts.colors.filter((c) => !a.colors.includes(c.name)).map((c) => { const on = a.avoidColors.includes(c.name); return <button key={c.name} aria-pressed={on} onClick={() => set((cur) => ({ avoidColors: toggle(cur.avoidColors, c.name) }))} className={cn(chip(on), "flex items-center gap-2")}><span className="size-4 rounded-full ring-1 ring-line" style={{ background: c.hex }} />{c.name}</button>; })}</div></div>
      </div>);
    case "seasons": return <div className="flex flex-wrap gap-2">{SEASONS.map((s) => <button key={s} aria-pressed={a.seasons.includes(s)} className={chip(a.seasons.includes(s))} onClick={() => set((cur) => ({ seasons: toggle(cur.seasons, s) }))}>{s[0]!.toUpperCase() + s.slice(1)}</button>)}</div>;
    case "budget": {
      const b = a.budget ?? { min: null, max: null };
      const sel = (key: "min" | "max", label: string, opts: number[]) => (
        <div><label htmlFor={`q-${key}`} className="mb-1 block text-sm">{label}</label>
          <select id={`q-${key}`} data-testid={`budget-${key}`} value={b[key] === null ? "" : String(b[key])} onChange={(e) => { const v = e.target.value === "" ? null : Number(e.target.value); set((cur) => { const nb = { ...(cur.budget ?? { min: null, max: null }), [key]: v }; return { budget: nb.min === null && nb.max === null ? null : nb }; }); }} className="min-h-11 rounded-sm border border-line bg-surface px-3">
            <option value="">{key === "min" ? "No minimum" : "No maximum"}</option>{opts.map((n) => <option key={n} value={n}>{money(n)}</option>)}</select></div>);
      const mx = BUDGET_STEPS.filter((n) => n > 0 && (b.min === null || n >= b.min)), mn = BUDGET_STEPS.filter((n) => n > 0 && (b.max === null || n <= b.max));
      return <div className="space-y-3"><div className="flex flex-wrap gap-4">{sel("min", "From", mn)}{sel("max", "Up to", mx)}</div><p className="text-xs text-mute">Catalog prices run from {money(facts.priceMin)} to {money(facts.priceMax)}. The budget applies to each item.</p></div>;
    }
    case "brands": return <div className="flex flex-wrap gap-2">{facts.brands.map((br) => <button key={br.slug} aria-pressed={a.brands.includes(br.slug)} className={chip(a.brands.includes(br.slug))} onClick={() => set((cur) => ({ brands: toggle(cur.brands, br.slug) }))}>{br.name}</button>)}</div>;
    case "audience": return <div role="radiogroup" aria-label="Sections" className="flex flex-wrap gap-2">{([["all", "Everything"], ["men", "Men’s section"], ["women", "Women’s section"]] as const).map(([v, l]) => <button key={v} role="radio" aria-checked={a.audience === v} className={chip(a.audience === v)} onClick={() => set({ audience: v })}>{l}</button>)}</div>;
  }
}
