import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Try it on" };

export default function Page() {
  return (
    <PageShell eyebrow="Virtual try-on" title="Try it on" intro="See pieces on an avatar shaped like you.">
      <ComingSoon stage="the fitting-room stage">The avatar and fitting room are built in a later stage.</ComingSoon>
    </PageShell>
  );
}
