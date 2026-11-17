import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Build an outfit" };

export default function Page() {
  return (
    <PageShell eyebrow="Style creator" title="Build an outfit" intro="Combine pieces into outfits you can save.">
      <ComingSoon stage="the style stage">The outfit creator is built in a later stage.</ComingSoon>
    </PageShell>
  );
}
