"use client";
import { formatMoney } from "@/lib/money";
import { COMBO_INFO, KIND_LABEL, QUESTIONS, STYLE_INFO, answered, deriveProfile, type Answers, type Facts, type QuestionId } from "@/modules/style/core";
import { OCCASION_LABEL } from "@/modules/outfit/core";

const SEASON = (s: string) => s[0]!.toUpperCase() + s.slice(1);
const FORMAL = ["Always casual", "Mostly casual", "Both", "Mostly formal", "Always formal"];

/** Plain-language view of the saved answers and the style tags generated from them. `onEdit` jumps to a question. */
export function ProfileSummary({ answers, facts, onEdit }: { answers: Answers; facts: Facts; onEdit?: (id: QuestionId) => void }) {
  const profile = deriveProfile(answers, facts, 0);
  const dept = (s: string) => facts.departments.find((d) => d.slug === s)?.name ?? s, brand = (s: string) => facts.brands.find((b) => b.slug === s)?.name ?? s;
  const money = (n: number) => formatMoney({ amount: n, currency: facts.currency });
  const val = (id: QuestionId): string | null => {
    if (!answered(answers, id)) return null;
    switch (id) {
      case "departments": return answers.departments.map(dept).join(", ");
      case "kinds": return answers.kinds.map((k) => KIND_LABEL[k] ?? k).join(", ");
      case "styles": return answers.styles.map((s) => STYLE_INFO[s].label).join(", ");
      case "combos": return answers.combos.map((c) => COMBO_INFO[c].label).join("; ");
      case "formality": return FORMAL[answers.formality! - 1] ?? "";
      case "occasions": return answers.occasions.map((o) => OCCASION_LABEL[o]).join(", ");
      case "colors": return [answers.colors.length ? `Like: ${answers.colors.join(", ")}` : "", answers.avoidColors.length ? `Avoid: ${answers.avoidColors.join(", ")}` : ""].filter(Boolean).join(" · ");
      case "seasons": return answers.seasons.map(SEASON).join(", ");
      case "budget": return `${answers.budget!.min !== null ? money(answers.budget!.min) : "Any"} to ${answers.budget!.max !== null ? money(answers.budget!.max) : "no limit"} per item`;
      case "brands": return answers.brands.map(brand).join(", ");
      case "audience": return answers.audience === "men" ? "Men’s" : "Women’s";
    }
  };
  return (
    <div className="space-y-4" data-testid="profile-summary">
      <div><p className="mb-2 text-xs uppercase tracking-wider text-mute">Your style tags</p>
        <ul className="flex flex-wrap gap-2">{profile.derived.tags.map((t) => <li key={t} className="rounded-full border border-line bg-surface px-3 py-1 text-sm">{t}</li>)}</ul></div>
      <dl className="divide-y divide-line rounded-md border border-line bg-surface">
        {QUESTIONS.map((q) => { const v = val(q.id); return (
          <div key={q.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 p-3" data-q={q.id}>
            <dt className="w-full text-xs uppercase tracking-wider text-mute sm:w-44">{q.title.replace(/\?$/, "")}</dt>
            <dd className="min-w-0 flex-1 text-sm">{v ?? <span className="text-mute">Skipped</span>}</dd>
            {onEdit && <dd><button className="min-h-9 text-sm underline underline-offset-4" onClick={() => onEdit(q.id)} aria-label={`Edit: ${q.title}`}>Edit</button></dd>}
          </div>); })}
      </dl>
    </div>
  );
}
