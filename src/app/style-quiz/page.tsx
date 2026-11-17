import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Find your style" };

export default function Page() {
  return (
    <PageShell eyebrow="Style quiz" title="Find your style" intro="A short quiz that tunes the showroom to your taste.">
      <ComingSoon stage="the style stage">The quiz and its results are built in a later stage.</ComingSoon>
    </PageShell>
  );
}
