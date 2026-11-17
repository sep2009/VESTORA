import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/product/ProductLabel";
import { EmptyState, ErrorState, Skeleton, Spinner } from "@/components/feedback/States";
import { ThemeScope, THEMES } from "@/components/ui/ThemeScope";
import { ShowroomLoader } from "@/components/showroom/ShowroomLoader";
import { Demos } from "./Demos";

export const metadata: Metadata = { title: "Design system" };

const swatches = ["paper", "surface", "ink", "mute", "line", "accent", "accent-ink", "ok", "warn", "danger"];
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-14"><h2 className="mb-4 text-xs uppercase tracking-[0.2em] text-mute">{title}</h2>{children}</section>
);

export default function DesignSystemPage() {
  return (
    <PageShell eyebrow="Reference" title="Design system" intro="Living reference for tokens and components. Everything below uses the same tokens as the live pages.">
      <Section title="Color tokens">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {swatches.map((s) => (
            <li key={s}><div className="h-16 rounded-md border border-line" style={{ background: `var(--color-${s})` }} /><p className="mt-1 text-xs">{s}</p></li>
          ))}
        </ul>
      </Section>
      <Section title="Typography">
        <p className="font-display text-display">Display</p>
        <p className="mt-2 font-display text-headline">Headline in serif</p>
        <p className="mt-2 text-base">Body in sans. The quick brown fox jumps over the lazy dog.</p>
        <p className="mt-2 text-xs uppercase tracking-[0.2em] text-mute">Eyebrow / label</p>
      </Section>
      <Section title="Buttons & labels">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button><Button variant="secondary">Secondary</Button><Button variant="ghost">Ghost</Button>
          <Button size="sm">Small</Button><Button size="lg">Large</Button><Button disabled>Disabled</Button>
          <Label kind="ink">Sold out</Label><Label kind="accent">Low stock</Label><Label>Neutral</Label>
        </div>
      </Section>
      <Section title="Overlays"><Demos /></Section>
      <Section title="States">
        <div className="grid gap-6 md:grid-cols-2">
          <EmptyState title="Empty state">Shown when a list has nothing to display.</EmptyState>
          <ErrorState>Shown when something fails.</ErrorState>
        </div>
        <div className="mt-6 flex items-center gap-6"><Spinner /><Skeleton className="h-24 w-40" /></div>
      </Section>
      <Section title="Showroom loading screen"><div className="h-56 overflow-hidden rounded-lg border border-line"><ShowroomLoader /></div></Section>
      <Section title="Department identities">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {THEMES.map((t) => (
            <ThemeScope key={t} theme={t} className="rounded-lg border border-line p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-mute">theme</p>
              <p className="font-display text-2xl">{t}</p>
              <p className="mt-2 text-sm text-accent-ink">Accent text</p>
              <div className="mt-4"><Button size="sm">Action</Button></div>
            </ThemeScope>
          ))}
        </div>
      </Section>
    </PageShell>
  );
}
