import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "AI Stylist" };

export default function Page() {
  return (
    <PageShell eyebrow="AI Stylist" title="AI Stylist" intro="Style recommendations from the real catalog.">
      <ComingSoon stage="not built yet">Needs a server-side AI provider key. Recommendations will only ever name products that exist in the catalog.</ComingSoon>
    </PageShell>
  );
}
