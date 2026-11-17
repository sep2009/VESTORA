import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Collections" };

export default function Page() {
  return (
    <PageShell eyebrow="Collections" title="Collections" intro="Curated edits from every department.">
      <ComingSoon stage="the catalog stage">Collections will list here once they exist in the catalog.</ComingSoon>
    </PageShell>
  );
}
